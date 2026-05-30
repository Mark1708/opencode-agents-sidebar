import { describe, expect, test } from "bun:test";
import { unlink } from "node:fs/promises";
import { buildAgentList, buildSidebarViewState, filterAgents, formatModelName, groupByCategory } from "./agents.js";
import { mergeAgentSources } from "./agents/merge.js";
import { resolveGenericCategory } from "./agents/categories.js";
import { configFingerprint, mergeConfig, readConfigAsync } from "./config.js";
import { DEFAULTS } from "./defaults.js";
import {
  agentFallbackCount,
  compactModelLabel,
  formatAgentLine,
  formatFullModelRef,
  formatHeaderLine,
  formatModel,
  formatProvider,
  formatSplitAgentLines,
  formatVariant,
  padLeft,
  splitModelRef,
  truncateTo,
} from "./format.js";
import { normalizeOmoConfig, orderedOmoAgentNames } from "./providers/omo.js";
import type { AgentEntry } from "./agents/types.js";
import type { AgentSourceState } from "./providers/types.js";
import type { OmoConfig } from "./providers/omo.js";

const SAMPLE_OMO_CONFIG: OmoConfig = {
  agents: {
    "test-agent": { model: "openai/gpt-5.5" },
    "reviewer-agent": { model: "openai/gpt-5.5", mode: "primary" },
  },
  agent_order: ["test-agent", "reviewer-agent"],
  disabled_agents: [],
  tui: {},
  team_mode: { enabled: false },
  tmux: { enabled: false },
};

async function withTempJson<T>(content: string, run: (path: string) => Promise<T>): Promise<T> {
  const path = `/tmp/test-agents-sidebar-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  await Bun.write(path, content);
  try {
    return await run(path);
  } finally {
    await unlink(path).catch(() => undefined);
  }
}

function agentEntry(overrides: Partial<AgentEntry> = {}): AgentEntry {
  return {
    id: "oh-my-openagent:hephaestus",
    name: "hephaestus",
    source: "oh-my-openagent",
    origin: "managed",
    mode: "unknown",
    category: "Orchestration",
    model: "openai/gpt-5.5",
    effectiveModel: "openai/gpt-5.5",
    modelSource: "explicit",
    disabled: false,
    hidden: false,
    metadata: { variant: undefined, fallback_models: [], fallbackCount: 0 },
    warnings: [],
    ...overrides,
  };
}

function sourceState(agents: AgentEntry[], overrides: Partial<AgentSourceState> = {}): AgentSourceState {
  return {
    source: "oh-my-openagent",
    agents,
    metadata: {},
    warnings: [],
    errors: [],
    watchedPaths: [],
    ...overrides,
  };
}

describe("agents sidebar provider foundation", () => {
  test("default title is OpenCode-first", () => {
    expect(DEFAULTS.title).toBe("Agents");
  });

  test("render core layer does not import OmoConfig or use old OmO missing copy", async () => {
    const renderSource = await Bun.file("src/render.ts").text();
    expect(renderSource).not.toContain("OmoConfig");
    expect(renderSource).not.toContain("OmO not configured");
  });

  test("OmO bootstrap provider normalizes agents into AgentEntry", () => {
    const state = normalizeOmoConfig(SAMPLE_OMO_CONFIG, "/tmp/omo.json");
    expect(state.source).toBe("oh-my-openagent");
    expect(state.agents.map((agent) => agent.id)).toEqual(["oh-my-openagent:test-agent", "oh-my-openagent:reviewer-agent"]);
    expect(state.agents[0]?.source).toBe("oh-my-openagent");
    expect(state.agents[1]?.mode).toBe("primary");
  });

  test("OmO lifecycle category map is provider-local and not generic", () => {
    expect(resolveGenericCategory(agentEntry({ id: "opencode:oracle", name: "oracle", source: "opencode", category: "" }))).toBe("Other");
    expect(normalizeOmoConfig({ agents: { oracle: { model: "openai/gpt-5.5" } } }).agents[0]?.category).toBe("Research");
  });

  test("disabled and hidden OmO mapping is preserved", () => {
    const state = normalizeOmoConfig({
      agents: {
        alpha: { model: "openai/gpt-5.5" },
        hidden: { model: "openai/gpt-5.5", hidden: true },
      },
      disabled_agents: ["alpha"],
      tui: { show_disabled: "dimmed" },
    });
    expect(state.agents.map((agent) => agent.name)).toEqual(["alpha"]);
    expect(state.agents[0]?.disabled).toBe(true);
  });

  test("show_disabled grouped moves disabled agents to Disabled category", () => {
    const state = normalizeOmoConfig({
      agents: { alpha: { model: "openai/gpt-5.5" } },
      disabled_agents: ["alpha"],
      tui: { show_disabled: "grouped" },
    });
    expect(state.agents[0]?.category).toBe("Disabled");
    expect(groupByCategory(state.agents).map((group) => group.category)).toContain("Disabled");
  });

  test("fallback models are stored in metadata", () => {
    const state = normalizeOmoConfig({
      agents: { beta: { fallback_models: [{ model: "openai/gpt-5.4-mini", variant: "medium" }] } },
    });
    expect(state.agents[0]?.modelSource).toBe("fallback");
    expect(state.agents[0]?.metadata.fallback_models).toEqual([{ model: "openai/gpt-5.4-mini", variant: "medium" }]);
    const [agent] = state.agents;
    expect(agent).toBeDefined();
    if (!agent) return;
    expect(agentFallbackCount(agent)).toBe(1);
  });

  test("buildAgentList consumes provider states instead of OmoConfig", () => {
    const agents = buildAgentList([sourceState([agentEntry({ name: "alpha" })])]);
    expect(agents.map((agent) => agent.name)).toEqual(["alpha"]);
  });

  test("mergeAgentSources keeps deterministic duplicate warning", () => {
    const duplicate = agentEntry({ id: "custom:one", name: "one", source: "custom", origin: "custom" });
    const original = agentEntry({ id: "oh-my-openagent:one", name: "one", source: "oh-my-openagent" });
    const agents = mergeAgentSources([sourceState([original]), sourceState([duplicate], { source: "custom" })]);
    expect(agents).toHaveLength(1);
    expect(agents[0]?.source).toBe("custom");
    expect(agents[0]?.warnings[0]?.code).toBe("duplicate-agent");
  });

  test("mergeAgentSources deduplicates source-qualified provider ids by normalized name", () => {
    const omo = agentEntry({ id: "oh-my-openagent:oracle", name: "oracle", source: "oh-my-openagent" });
    const opencode = agentEntry({ id: "opencode:oracle", name: "oracle", source: "opencode", origin: "builtin", category: "Primary" });
    const agents = mergeAgentSources([sourceState([omo]), sourceState([opencode], { source: "opencode" })]);
    expect(agents).toHaveLength(1);
    expect(agents[0]?.id).toBe("opencode:oracle");
    expect(agents[0]?.warnings[0]?.metadata?.duplicateSource).toBe("oh-my-openagent");
  });

  test("buildSidebarViewState preserves provider diagnostics", () => {
    const viewState = buildSidebarViewState([
      sourceState([], {
        errors: [{ code: "omo-config-invalid", severity: "error", message: "bad json", source: "oh-my-openagent", path: "/tmp/omo.json" }],
      }),
    ], DEFAULTS);
    expect(viewState.kind).toBe("loaded");
    if (viewState.kind !== "loaded") return;
    expect(viewState.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["omo-config-invalid"]);
    expect(viewState.hasConfiguredAgents).toBe(false);
  });
});

describe("agents sidebar pure functions", () => {
  test("orderedOmoAgentNames ignores duplicates in agent_order", () => {
    const names = orderedOmoAgentNames({
      agents: { alpha: {}, beta: {}, "code-reviewer": {} },
      agent_order: ["beta", "alpha", "beta", "missing"],
    });
    expect(names).toEqual(["beta", "alpha", "code-reviewer"]);
  });

  test("groupByCategory works with normalized AgentEntry", () => {
    const groups = groupByCategory([agentEntry({ name: "x", category: "Other" })]);
    expect(groups.find((group) => group.category === "Other")?.agents.map((agent) => agent.name)).toEqual(["x"]);
    expect(groups.find((group) => group.category === "Other")?.hasUnmapped).toBe(true);
  });

  test("filterAgents finds model variant and fallback queries", () => {
    const agents = [agentEntry({ metadata: { variant: "medium", fallback_models: [{ model: "opencode/big-pickle" }] } })];
    expect(filterAgents(agents, "gpt-5.5").map((agent) => agent.name)).toEqual(["hephaestus"]);
    expect(filterAgents(agents, "medium").map((agent) => agent.name)).toEqual(["hephaestus"]);
    expect(filterAgents(agents, "big-pickle").map((agent) => agent.name)).toEqual(["hephaestus"]);
  });

  test("invalid JSON returns invalid ConfigState", async () => {
    await withTempJson("{ broken", async (path) => {
      const state = await readConfigAsync(path);
      expect(state.kind).toBe("invalid");
    });
  });

  test("configFingerprint includes missing and invalid states", () => {
    expect(configFingerprint({ kind: "missing", path: "/tmp/missing.json" })).toBe("missing:/tmp/missing.json");
    expect(configFingerprint({ kind: "invalid", path: "/tmp/bad.json", error: "bad json" })).toBe("invalid:/tmp/bad.json:bad json");
  });

  test("mergeConfig user aliases extend defaults", () => {
    const config = mergeConfig({ provider_aliases: { anthropic: "ant" }, model_aliases: { "claude-opus-4.5": "opus4.5" } });
    expect(config.provider_aliases.openai).toBe("oa");
    expect(config.provider_aliases.anthropic).toBe("ant");
    expect(config.model_aliases["gpt-5.5"]).toBe("5.5");
    expect(config.model_aliases["claude-opus-4.5"]).toBe("opus4.5");
  });

  test("formatModelName supports fallback prefix and variant alias", () => {
    expect(formatModelName("openai/gpt-5.5", "medium", { modelSource: "fallback" })).toBe("fb:oa/gpt-5.5 · M");
  });

  test("padLeft right-aligns and truncates safely", () => {
    expect(padLeft("zai", 6)).toBe("   zai");
    expect(padLeft("abcdef", 4)).toBe("abc…");
  });

  test("truncateTo sanitizes control characters", () => {
    expect(truncateTo("alpha\nbeta\u0000gamma\u007F", 40)).toBe("alpha beta gamma ");
  });

  test("splitModelRef separates provider from model", () => {
    expect(splitModelRef("openai/gpt-5.5")).toEqual({ provider: "openai", model: "gpt-5.5" });
    expect(splitModelRef(undefined)).toEqual({ provider: "", model: "" });
  });

  test("formatProvider and formatModel compact known values", () => {
    expect(formatProvider("zai-coding-plan")).toBe("zai");
    expect(formatModel("gpt-5.4-mini")).toBe("gpt-5.4m");
  });

  test("formatFullModelRef shows variant when enabled", () => {
    expect(formatFullModelRef("openai/gpt-5.5", "medium", { showVariant: true })).toBe("openai/gpt-5.5 · medium");
  });

  test("formatVariant compacts known variants", () => {
    expect(formatVariant("medium")).toBe("M");
    expect(formatVariant("unknown")).toBe("");
  });

  test("formatAgentLine in details-only mode shows name only", () => {
    const line = formatAgentLine(agentEntry(), { selected: false, symbols: "unicode", width: 34, modelDisplay: "details-only" });
    expect(line).toBe(`  hephaestus${" ".repeat(22)}`);
  });

  test("formatAgentLine in inline mode keeps compact model behavior", () => {
    const line = formatAgentLine(agentEntry(), { selected: false, symbols: "unicode", width: 34, modelDisplay: "inline" });
    expect(line).toContain("oa/5.5");
  });

  test("formatSplitAgentLines puts fallback prefix on model line only", () => {
    const [line1, line2] = formatSplitAgentLines(agentEntry({ model: "openai/gpt-5.4-mini", modelSource: "fallback", metadata: { fallbackCount: 2 } }), {
      width: 34,
      selected: false,
      symbols: "ascii",
      modelDisplay: "inline",
    });
    expect(line1).toBe("  hephaestus                openai");
    expect(line2).toBe("                    fb:gpt-5.4m +2");
  });

  test("formatSplitAgentLines includes variant and fallback count", () => {
    const [, line2] = formatSplitAgentLines(agentEntry({ metadata: { variant: "medium", fallbackCount: 3 } }), {
      width: 34,
      selected: false,
      symbols: "unicode",
      modelDisplay: "inline",
    });
    expect(line2).toBe("                      gpt-5.5 M +3");
  });

  test("formatHeaderLine supports neutral title", () => {
    expect(formatHeaderLine("▼ Agents", "33", 34)).toBe("▼ Agents                        33");
  });

  test("compactModelLabel supports aliases and provider toggle", () => {
    expect(compactModelLabel(agentEntry(), true)).toBe("oa/5.5");
    expect(compactModelLabel(agentEntry(), false)).toBe("5.5");
  });
});
