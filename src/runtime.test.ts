import { describe, expect, test } from "bun:test";
import { DEFAULTS } from "./defaults.js";
import {
  createReloadController,
  loadSidebarRuntimeState,
  type SidebarRuntimeState,
} from "./runtime.js";
import type { LoadedAgentSources } from "./providers/index.js";
import type { AgentSourceState } from "./providers/types.js";

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolvePromise: ((value: T) => void) | undefined;
  return {
    promise: new Promise<T>((resolve) => { resolvePromise = resolve; }),
    resolve: (value) => resolvePromise?.(value),
  };
}

function source(overrides: Partial<AgentSourceState> = {}): AgentSourceState {
  return {
    source: "oh-my-openagent",
    agents: [],
    metadata: {
      configState: "loaded",
      configuredAgentCount: 0,
      tui: {},
      team_mode: {},
      tmux: {},
    },
    warnings: [],
    errors: [],
    watchedPaths: ["/tmp/oh-my-openagent.json"],
    ...overrides,
  };
}

function loadedSources(omo: AgentSourceState): LoadedAgentSources {
  return { sources: [omo], agents: omo.agents };
}

function state(fingerprint: string): SidebarRuntimeState {
  return {
    kind: "missing",
    path: `/tmp/${fingerprint}.json`,
    renderConfig: DEFAULTS,
    fingerprint,
    watchSpec: { paths: [`/tmp/${fingerprint}.json`], pollIntervalMs: 2000 },
  };
}

describe("Agents runtime state", () => {
  test("distinguishes valid-empty, missing, invalid, and read errors", async () => {
    const validEmpty = await loadSidebarRuntimeState({
      loadSources: async () => loadedSources(source()),
    });
    const missing = await loadSidebarRuntimeState({
      loadSources: async () => loadedSources(source({ metadata: { configState: "missing" } })),
    });
    const invalid = await loadSidebarRuntimeState({
      loadSources: async () => loadedSources(source({
        metadata: { configState: "invalid", configError: "bad json" },
        errors: [{ code: "omo-config-invalid", severity: "error", message: "bad json", source: "oh-my-openagent" }],
      })),
    });
    const failed = await loadSidebarRuntimeState({
      loadSources: async () => { throw new Error("disk unavailable\nsecret detail"); },
      fallbackWatchSpec: { paths: ["/tmp/recover.json"], pollIntervalMs: 9000 },
    });

    expect(validEmpty.kind).toBe("loaded");
    if (validEmpty.kind === "loaded") expect(validEmpty.hasConfiguredAgents).toBe(false);
    expect(missing.kind).toBe("missing");
    expect(invalid.kind).toBe("invalid");
    if (invalid.kind === "invalid") expect(invalid.error).toBe("bad json");
    expect(failed.kind).toBe("error");
    expect(failed.watchSpec).toEqual({ paths: ["/tmp/recover.json"], pollIntervalMs: 9000 });
    if (failed.kind === "error") expect(failed.error).toBe("disk unavailable");
  });

  test("fingerprint changes for config and diagnostics but is stable for identical state", async () => {
    const base = source();
    const titled = source({ metadata: { ...base.metadata, tui: { title: "Reviewers" } } });
    const diagnosed = source({
      warnings: [{ code: "provider-warning", severity: "warning", message: "degraded", source: "oh-my-openagent" }],
    });
    const first = await loadSidebarRuntimeState({ loadSources: async () => loadedSources(base) });
    const repeated = await loadSidebarRuntimeState({ loadSources: async () => loadedSources(base) });
    const configChanged = await loadSidebarRuntimeState({ loadSources: async () => loadedSources(titled) });
    const diagnosticsChanged = await loadSidebarRuntimeState({ loadSources: async () => loadedSources(diagnosed) });

    expect(repeated.fingerprint).toBe(first.fingerprint);
    expect(configChanged.fingerprint).not.toBe(first.fingerprint);
    expect(diagnosticsChanged.fingerprint).not.toBe(first.fingerprint);
  });
});

describe("serialized reload controller", () => {
  test("coalesces overlap and never publishes the stale completion", async () => {
    const first = deferred<SidebarRuntimeState>();
    const second = deferred<SidebarRuntimeState>();
    let reads = 0;
    const accepted: string[] = [];
    const controller = createReloadController({
      initialState: state("initial"),
      load: async () => (++reads === 1 ? first.promise : second.promise),
      accept: (next) => { accepted.push(next.fingerprint); },
    });

    const firstRequest = controller.request();
    const secondRequest = controller.request();
    first.resolve(state("stale"));
    await Promise.resolve();
    second.resolve(state("fresh"));
    await Promise.all([firstRequest, secondRequest]);

    expect(reads).toBe(2);
    expect(accepted).toEqual(["fresh"]);
  });

  test("suppresses identical states and late completion after dispose", async () => {
    const late = deferred<SidebarRuntimeState>();
    const accepted: string[] = [];
    const initial = state("same");
    let reads = 0;
    const controller = createReloadController({
      initialState: initial,
      load: async () => {
        reads += 1;
        return reads === 1 ? initial : late.promise;
      },
      accept: (next) => { accepted.push(next.fingerprint); },
    });

    await controller.request();
    const pending = controller.request();
    controller.dispose();
    late.resolve(state("late"));
    await pending;

    expect(accepted).toEqual([]);
  });
});
