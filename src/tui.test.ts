import { describe, expect, test } from "bun:test";
import { unlink } from "node:fs/promises";
import {
  buildAgentList,
  filterAgents,
  formatModelName,
  getCategory,
  groupByCategory,
  orderedAgentNames,
} from "./agents.js";
import {
  configFingerprint,
  mergeConfig,
  readConfigAsync,
} from "./config.js";
import {
  compactModelLabel,
  formatAgentLine,
  formatHeaderLine,
  formatFullModelRef,
  formatModel,
  formatProvider,
  formatSplitAgentLines,
  formatVariant,
  initialSectionCollapsed,
  padLeft,
  splitModelRef,
  truncateTo,
} from "./format.js";
import type {
  AgentEntry,
  OmoConfig,
} from "./types.js";

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

const CONFIG_WITH_FALLBACKS: OmoConfig = {
  agents: {
    "deep-agent": {
      model: "openai/gpt-5.5",
      fallback_models: [{ model: "opencode/big-pickle" }, { model: "openai/gpt-5.4-mini" }],
      variant: "medium",
    },
  },
  agent_order: ["deep-agent"],
  disabled_agents: [],
  tui: {},
  team_mode: { enabled: false },
  tmux: { enabled: false },
};

const EMPTY_CONFIG: OmoConfig = {};

const CONFIG_WITH_CATEGORIES: OmoConfig = {
  agents: {
    "custom-agent": { model: "openai/gpt-5.5" },
  },
  agent_order: ["custom-agent"],
  disabled_agents: [],
  tui: {
    agent_categories: { "custom-agent": "Custom" },
    category_order: ["Custom", "Other"],
  },
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

function baseConfig(overrides: Partial<OmoConfig> = {}): OmoConfig {
  return {
    agents: {
      alpha: { model: "openai/gpt-5.5", fallback_models: [{ model: "opencode/big-pickle" }] },
      beta: { fallback_models: [{ model: "openai/gpt-5.4-mini" }] },
      "code-reviewer": { fallback_models: [{ model: "openai/gpt-5.4-mini" }] },
    },
    agent_order: ["alpha"],
    disabled_agents: [],
    ...overrides,
  };
}

function agentEntry(overrides: Partial<AgentEntry> = {}): AgentEntry {
  return {
    name: "hephaestus",
    category: "Orchestration",
    model: "openai/gpt-5.5",
    variant: undefined,
    modelSource: "primary",
    fallbackCount: 0,
    fallbacks: [],
    mode: undefined,
    disabled: false,
    hidden: false,
    unmapped: false,
    ...overrides,
  };
}

describe("agents sidebar pure functions", () => {
  test("multimodal-looker maps to Research", () => {
    expect(getCategory("multimodal-looker")).toBe("Research");
    expect(getCategory("multimodal_looker")).toBe("Research");
  });

  test("fixture config has empty Other category", () => {
    const config = CONFIG_WITH_CATEGORIES;
    const groups = groupByCategory(buildAgentList(config), config);
    expect(groups.find((group) => group.category === "Other")).toBeUndefined();
  });

  test("agents missing from agent_order are still displayed alphabetically", () => {
    const agents = buildAgentList(baseConfig());
    expect(agents.map((agent) => agent.name)).toEqual(["alpha", "beta", "code-reviewer"]);
  });

  test("disabled_agents marks matching agents", () => {
    const agents = buildAgentList(baseConfig({ disabled_agents: ["alpha"] }));
    expect(agents.find((agent) => agent.name === "alpha")?.disabled).toBe(true);
  });

  test("show_disabled hidden removes disabled agents", () => {
    const agents = buildAgentList(baseConfig({
      disabled_agents: ["alpha"],
      tui: { show_disabled: "hidden" },
    }));
    expect(agents.map((agent) => agent.name)).not.toContain("alpha");
  });

  test("show_disabled dimmed keeps disabled agents with flag", () => {
    const agents = buildAgentList(baseConfig({
      disabled_agents: ["alpha"],
      tui: { show_disabled: "dimmed" },
    }));
    expect(agents.find((agent) => agent.name === "alpha")?.disabled).toBe(true);
  });

  test("primary model sets modelSource primary", () => {
    const agent = buildAgentList(baseConfig()).find((entry) => entry.name === "alpha");
    expect(agent?.modelSource).toBe("primary");
  });

  test("fallback-only model sets modelSource fallback", () => {
    const agent = buildAgentList(baseConfig()).find((entry) => entry.name === "beta");
    expect(agent?.modelSource).toBe("fallback");
  });

  test("variant appears in compact model label", () => {
    expect(formatModelName("openai/gpt-5.5", "medium")).toBe("oa/gpt-5.5 · M");
  });

  test("fingerprint changes on variant fallback disabled tui team and tmux changes", () => {
    const original = configFingerprint({ kind: "loaded", path: "test", config: baseConfig() });
    const changedConfigs: OmoConfig[] = [
      baseConfig({ agents: { ...baseConfig().agents, alpha: { model: "openai/gpt-5.5", variant: "high" } } }),
      baseConfig({ agents: { ...baseConfig().agents, alpha: { model: "openai/gpt-5.5", fallback_models: [{ model: "zai-coding-plan/glm-5.1" }] } } }),
      baseConfig({ disabled_agents: ["alpha"] }),
      baseConfig({ tui: { symbols: "ascii" } }),
      baseConfig({ team_mode: { enabled: true, max_parallel_members: 2 } }),
      baseConfig({ tmux: { enabled: true, main_pane_size: 50 } }),
    ];
    const fingerprints = changedConfigs.map((config) => configFingerprint({ kind: "loaded", path: "test", config }));
    expect(fingerprints.every((fingerprint) => fingerprint !== original)).toBe(true);
  });

  test("invalid JSON returns invalid ConfigState", async () => {
    await withTempJson("{ broken", async (path) => {
      const state = await readConfigAsync(path);
      expect(state.kind).toBe("invalid");
    });
  });

  test("readConfigAsync returns missing state for missing file", async () => {
    const path = `/tmp/test-agents-sidebar-missing-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
    const state = await readConfigAsync(path);
    expect(state).toEqual({ kind: "missing", path });
  });

  test("readConfigAsync rejects non-object JSON", async () => {
    const invalidJsonValues = ["\"hello\"", "[]", "42"];
    for (const value of invalidJsonValues) {
      await withTempJson(value, async (path) => {
        const state = await readConfigAsync(path);
        expect(state).toEqual({ kind: "invalid", path, error: "Config must be a JSON object" });
      });
    }
  });

  test("readConfigAsync loads fixture config from temp file", async () => {
    await withTempJson(JSON.stringify(SAMPLE_OMO_CONFIG), async (path) => {
      const state = await readConfigAsync(path);
      expect(state.kind).toBe("loaded");
      if (state.kind === "loaded") {
        expect(state.config.agents?.["test-agent"]?.model).toBe("openai/gpt-5.5");
      }
    });
  });

  test("hidden agents are not displayed", () => {
    const agents = buildAgentList(baseConfig({
      agents: { hidden: { model: "openai/gpt-5.5", hidden: true } },
    }));
    expect(agents).toHaveLength(0);
  });

  test("extra categories from config are preserved", () => {
    const config = baseConfig({
      agents: { custom: { model: "openai/gpt-5.5", category: "Experimental" } },
    });
    expect(groupByCategory(buildAgentList(config), config).map((group) => group.category)).toContain("Experimental");
  });

  test("filterAgents finds reviewer agents", () => {
    const agents = buildAgentList(baseConfig());
    expect(filterAgents(agents, "review").map((agent) => agent.name)).toEqual(["code-reviewer"]);
  });

  test("filterAgents finds model variant and fallback queries", () => {
    const agents = buildAgentList(CONFIG_WITH_FALLBACKS);
    expect(filterAgents(agents, "gpt-5.5").map((agent) => agent.name)).toEqual(["deep-agent"]);
    expect(filterAgents(agents, "medium").map((agent) => agent.name)).toEqual(["deep-agent"]);
    expect(filterAgents(agents, "big-pickle").map((agent) => agent.name)).toEqual(["deep-agent"]);
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
    expect(splitModelRef("big-pickle")).toEqual({ provider: "", model: "big-pickle" });
    expect(splitModelRef(undefined)).toEqual({ provider: "", model: "" });
  });

  test("formatProvider keeps split-mode provider names readable", () => {
    expect(formatProvider("openai")).toBe("openai");
    expect(formatProvider("opencode")).toBe("opencode");
    expect(formatProvider("zai-coding-plan")).toBe("zai");
    expect(formatProvider("other")).toBe("other");
  });

  test("formatModel compacts split-mode model names", () => {
    expect(formatModel("gpt-5.5")).toBe("gpt-5.5");
    expect(formatModel("gpt-5.4-mini")).toBe("gpt-5.4m");
    expect(formatModel("gpt-5.4-mini-fast")).toBe("gpt-5.4mf");
    expect(formatModel("glm-5.1")).toBe("glm-5.1");
    expect(formatModel("big-pickle")).toBe("big-pickle");
  });

  test("formatFullModelRef returns full model without shortening", () => {
    expect(formatFullModelRef("zai-coding-plan/glm-5.1")).toBe("zai-coding-plan/glm-5.1");
    expect(formatFullModelRef("openai/gpt-5.5")).toBe("openai/gpt-5.5");
    expect(formatFullModelRef("opencode/big-pickle")).toBe("opencode/big-pickle");
    expect(formatFullModelRef(undefined)).toBe("—");
  });

  test("formatFullModelRef shows variant when enabled", () => {
    expect(formatFullModelRef("openai/gpt-5.5", "medium", { showVariant: true })).toBe("openai/gpt-5.5 · medium");
  });

  test("formatFullModelRef hides variant by default", () => {
    expect(formatFullModelRef("openai/gpt-5.5", "medium")).toBe("openai/gpt-5.5");
  });

  test("formatVariant compacts known variants", () => {
    expect(formatVariant("medium")).toBe("M");
    expect(formatVariant("high")).toBe("H");
    expect(formatVariant("xhigh")).toBe("XH");
    expect(formatVariant("unknown")).toBe("");
  });

  test("formatAgentLine in details-only mode shows name only", () => {
    const line = formatAgentLine(agentEntry(), {
      selected: false,
      symbols: "unicode",
      width: 34,
      modelDisplay: "details-only",
    });
    expect(line).toBe(`  hephaestus${" ".repeat(22)}`);
    expect(line).toHaveLength(34);
  });

  test("formatAgentLine in hidden mode shows name only", () => {
    const line = formatAgentLine(agentEntry(), {
      selected: true,
      symbols: "unicode",
      width: 34,
      modelDisplay: "hidden",
    });
    expect(line).toMatch(/^› hephaestus\s+$/);
    expect(line).toHaveLength(34);
  });

  test("formatAgentLine in inline mode keeps current behavior", () => {
    const line = formatAgentLine(agentEntry(), {
      selected: false,
      symbols: "unicode",
      width: 34,
      modelDisplay: "inline",
    });
    expect(line).toContain("oa/5.5");
  });

  test("formatAgentLine handles width edge cases", () => {
    expect(formatAgentLine(agentEntry(), {
      selected: true,
      symbols: "unicode",
      width: 5,
      modelDisplay: "details-only",
    })).toBe("› he…");
    expect(formatAgentLine(agentEntry(), {
      selected: true,
      symbols: "unicode",
      width: 1,
      modelDisplay: "details-only",
    })).toBe("…");
  });

  test("formatSplitAgentLines in details-only mode returns name-only lines", () => {
    const [line1, line2] = formatSplitAgentLines(agentEntry(), {
      width: 34,
      selected: true,
      symbols: "unicode",
      modelDisplay: "details-only",
    });
    expect(line1).toBe(`› hephaestus${" ".repeat(22)}`);
    expect(line2).toBe(" ".repeat(34));
  });

  test("formatSplitAgentLines formats primary model across two fixed-width lines", () => {
    const [line1, line2] = formatSplitAgentLines(agentEntry(), {
      width: 34,
      selected: true,
      symbols: "unicode",
      modelDisplay: "inline",
    });
    expect(line1).toBe("› hephaestus                openai");
    expect(line2).toBe("                           gpt-5.5");
    expect(line1).toHaveLength(34);
    expect(line2).toHaveLength(34);
  });

  test("formatSplitAgentLines handles width edge cases", () => {
    const [name5, detail5] = formatSplitAgentLines(agentEntry(), {
      width: 5,
      selected: true,
      symbols: "unicode",
      modelDisplay: "inline",
    });
    expect(name5).toBe("› he…");
    expect(detail5).toBe("    …");

    const [name1, detail1] = formatSplitAgentLines(agentEntry(), {
      width: 1,
      selected: true,
      symbols: "unicode",
      modelDisplay: "inline",
    });
    expect(name1).toBe("…");
    expect(detail1).toBe("…");
  });

  test("formatSplitAgentLines puts fallback prefix on model line only", () => {
    const [line1, line2] = formatSplitAgentLines(agentEntry({
      model: "openai/gpt-5.4-mini",
      modelSource: "fallback",
      fallbackCount: 2,
    }), {
      width: 34,
      selected: false,
      symbols: "ascii",
      modelDisplay: "inline",
    });
    expect(line1).toBe("  hephaestus                openai");
    expect(line2).toBe("                    fb:gpt-5.4m +2");
  });

  test("formatSplitAgentLines includes variant and fallback count", () => {
    const [, line2] = formatSplitAgentLines(agentEntry({ variant: "medium", fallbackCount: 3 }), {
      width: 34,
      selected: false,
      symbols: "unicode",
      modelDisplay: "inline",
    });
    expect(line2).toBe("                      gpt-5.5 M +3");
  });

  test("formatSplitAgentLines supports provider aliases and compact models", () => {
    const [line1, line2] = formatSplitAgentLines(agentEntry({
      name: "sisyphus",
      model: "zai-coding-plan/glm-5.1",
      fallbackCount: 2,
    }), {
      width: 34,
      selected: false,
      symbols: "unicode",
      modelDisplay: "inline",
    });
    expect(line1).toBe("  sisyphus                     zai");
    expect(line2).toBe("                        glm-5.1 +2");
  });

  test("formatHeaderLine supports expanded and collapsed section markers", () => {
    expect(formatHeaderLine("▼ OmO Agents", "33", 34)).toBe("▼ OmO Agents                    33");
    expect(formatHeaderLine("▶ OmO Agents", "33", 34)).toBe("▶ OmO Agents                    33");
  });

  test("initialSectionCollapsed reads default_agents_collapsed once-ready value", () => {
    expect(initialSectionCollapsed({ tui: { default_agents_collapsed: true } })).toBe(true);
    expect(initialSectionCollapsed({ tui: { default_agents_collapsed: false } })).toBe(false);
    expect(initialSectionCollapsed({})).toBe(false);
  });

  test("configFingerprint includes missing and invalid states", () => {
    expect(configFingerprint({ kind: "missing", path: "/tmp/missing.json" })).toBe("missing:/tmp/missing.json");
    expect(configFingerprint({ kind: "invalid", path: "/tmp/bad.json", error: "bad json" })).toBe("invalid:/tmp/bad.json:bad json");
  });

  test("buildAgentList returns empty list for empty config", () => {
    expect(buildAgentList(EMPTY_CONFIG)).toEqual([]);
  });

  test("show_disabled grouped moves disabled agents to Disabled category", () => {
    const agents = buildAgentList(baseConfig({
      disabled_agents: ["alpha"],
      tui: { show_disabled: "grouped" },
    }));
    expect(agents.find((agent) => agent.name === "alpha")?.category).toBe("Disabled");
    expect(groupByCategory(agents, { tui: { show_disabled: "grouped" } }).map((group) => group.category)).toContain("Disabled");
  });

  test("orderedAgentNames ignores duplicates in agent_order", () => {
    const names = orderedAgentNames(baseConfig({ agent_order: ["beta", "alpha", "beta", "missing"] }));
    expect(names).toEqual(["beta", "alpha", "code-reviewer"]);
  });

  test("custom provider and model aliases from config are used", () => {
    const config = mergeConfig({
      provider_aliases: { openai: "o" },
      model_aliases: { "gpt-5.5": "five-five" },
    });
    expect(compactModelLabel(agentEntry(), true, config)).toBe("o/five-five");
  });

  test("mergeConfig user aliases extend defaults", () => {
    const config = mergeConfig({
      provider_aliases: { anthropic: "ant" },
      model_aliases: { "claude-opus-4.5": "opus4.5" },
    });
    expect(config.provider_aliases.openai).toBe("oa");
    expect(config.provider_aliases.anthropic).toBe("ant");
    expect(config.model_aliases["gpt-5.5"]).toBe("5.5");
    expect(config.model_aliases["claude-opus-4.5"]).toBe("opus4.5");
  });

  test("compactModelLabel omits provider when showProvider is false", () => {
    expect(compactModelLabel(agentEntry(), false)).toBe("5.5");
  });

  test("groupByCategory puts unmapped agents in Other", () => {
    const groups = groupByCategory(buildAgentList(SAMPLE_OMO_CONFIG), SAMPLE_OMO_CONFIG);
    expect(groups.find((group) => group.category === "Other")?.agents.map((agent) => agent.name)).toEqual([
      "test-agent",
      "reviewer-agent",
    ]);
    expect(groups.find((group) => group.category === "Other")?.hasUnmapped).toBe(true);
  });

  test("formatAgentLine truncates very long agent names", () => {
    const line = formatAgentLine(agentEntry({ name: "agent-with-a-very-long-name" }), {
      selected: false,
      symbols: "unicode",
      width: 12,
      modelDisplay: "details-only",
    });
    expect(line).toBe("  agent-wit…");
    expect(line).toHaveLength(12);
  });

  test("unicode agent names are preserved and searchable", () => {
    const config = baseConfig({
      agents: { "агент-тест": { model: "openai/gpt-5.5" } },
      agent_order: ["агент-тест"],
    });
    const agents = buildAgentList(config);
    expect(formatAgentLine(agents[0]!, { selected: false, symbols: "unicode", width: 20, modelDisplay: "details-only" })).toContain("агент-тест");
    expect(filterAgents(agents, "агент").map((agent) => agent.name)).toEqual(["агент-тест"]);
  });
});
