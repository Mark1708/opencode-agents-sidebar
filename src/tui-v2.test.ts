import { describe, expect, test } from "bun:test";
import { createRenderEffect, createRoot, createSignal } from "solid-js/dist/solid.js";
import serverPlugin from "./index.js";
import agentsTuiPlugin, {
  createAgentsTuiDefinition,
  type SidebarAccessors,
} from "./tui.js";
import { mountSidebar } from "./render.js";
import { DEFAULTS } from "./defaults.js";
import type { SidebarRuntimeState } from "./runtime.js";

type TestTheme = Readonly<{
  text: Readonly<{
    base: string;
    muted: string;
    feedback: Readonly<{
      warning: Readonly<{ base: string }>;
      error: Readonly<{ base: string }>;
    }>;
  }>;
  background: Readonly<{ base: string }>;
  border: Readonly<{ base: string }>;
}>;

function theme(base: string): TestTheme {
  return {
    text: {
      base,
      muted: `${base}-muted`,
      feedback: {
        warning: { base: `${base}-warning` },
        error: { base: `${base}-error` },
      },
    },
    background: { base: `${base}-background` },
    border: { base: `${base}-border` },
  };
}

function loadedState(fingerprint: string, defaults: string[] = []): SidebarRuntimeState {
  return {
    kind: "loaded",
    agents: [],
    hasConfiguredAgents: false,
    sidebarConfig: { ...DEFAULTS },
    providerStatus: {
      showTeam: true,
      teamEnabled: false,
      showTmux: true,
      tmuxEnabled: false,
    },
    diagnostics: [],
    defaultCollapsed: defaults,
    defaultSectionCollapsed: true,
    renderConfig: { ...DEFAULTS },
    fingerprint,
    watchSpec: { paths: ["/tmp/omo.json"], pollIntervalMs: 2000 },
  };
}

function missingState(fingerprint: string): SidebarRuntimeState {
  return {
    kind: "missing",
    path: "/tmp/omo.json",
    renderConfig: { ...DEFAULTS },
    fingerprint,
    watchSpec: { paths: ["/tmp/omo.json"], pollIntervalMs: 2000 },
  };
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
}

describe("Agents V2 plugin", () => {
  test("exports server and TUI definitions with only id and setup", () => {
    expect(Object.keys(serverPlugin).sort()).toEqual(["id", "setup"]);
    expect(Object.keys(agentsTuiPlugin).sort()).toEqual(["id", "setup"]);
    expect(serverPlugin.id).toBe("agents-sidebar");
    expect(agentsTuiPlugin.id).toBe("agents-sidebar.tui");
  });

  test("mounts one tracked subtree whose state, click, selection, and theme reads stay live", () => {
    let disposeRoot = (): void => undefined;
    let inserts = 0;
    let containers = 0;
    let rendered = "";
    let toggleCategory = (): void => undefined;
    let toggleAgent = (): void => undefined;
    let publishState = (_state: SidebarRuntimeState): void => undefined;
    let publishTheme = (_theme: TestTheme): void => undefined;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [getState, setState] = createSignal<SidebarRuntimeState>(loadedState("one"));
      const [getCollapsed, setCollapsed] = createSignal<Record<string, boolean>>({});
      const [getSelected, setSelected] = createSignal<string | null>(null);
      const [getSectionCollapsed] = createSignal(false);
      const [getTheme, setTheme] = createSignal(theme("light"));
      publishState = setState;
      publishTheme = setTheme;
      mountSidebar({
        getState,
        getCollapsedState: getCollapsed,
        getSelectedAgent: getSelected,
        getSectionCollapsed,
        onToggleCategory: (category) => setCollapsed((current) => ({ ...current, [category]: !current[category] })),
        onToggleAgent: (name) => setSelected((current) => current === name ? null : name),
        onToggleSection: () => undefined,
        getTheme,
      }, {
        createContainer: () => { containers += 1; return { kind: "container" }; },
        insert: (_container, accessor) => {
          inserts += 1;
          createRenderEffect(() => { rendered = String(accessor()); });
        },
        render: (input) => {
          toggleCategory = () => input.toggleCategory("Research");
          toggleAgent = () => input.toggleAgent("oracle");
          return `${input.state.fingerprint}|${String(input.collapsedState.Research)}|${input.selectedAgent ?? ""}|${String(input.theme.text)}`;
        },
        renderError: (message) => `error:${message}`,
      });
    });

    expect(rendered).toBe("one|undefined||light");
    publishState(loadedState("two"));
    expect(rendered).toBe("two|undefined||light");
    toggleCategory();
    expect(rendered).toBe("two|true||light");
    toggleAgent();
    expect(rendered).toBe("two|true|oracle|light");
    publishTheme(theme("dark"));
    expect(rendered).toBe("two|true|oracle|dark");
    expect(containers).toBe(1);
    expect(inserts).toBe(1);
    disposeRoot();
  });

  test("initializes collapse only on first loaded state and preserves user state across reloads", async () => {
    const states = [missingState("missing"), loadedState("loaded", ["Research"]), loadedState("changed", ["Engineering"])];
    let reads = 0;
    let triggerReload: (() => Promise<void>) | undefined;
    let accessors: SidebarAccessors | undefined;
    let slotClaims = 0;
    let slotRender: (() => unknown) | undefined;
    let watcherDisposals = 0;
    const updates: string[][] = [];
    const definition = createAgentsTuiDefinition({
      loadRuntimeState: async () => states[Math.min(reads++, states.length - 1)] ?? missingState("fallback"),
      createWatcher: (reload) => {
        triggerReload = reload;
        return {
          update: (paths) => { updates.push([...paths]); },
          dispose: () => { watcherDisposals += 1; },
        };
      },
      mountPanel: (nextAccessors) => {
        accessors = nextAccessors;
        return {} as never;
      },
    });
    const context = {
      theme: theme("light"),
      ui: {
        slot: (claim: { render: () => unknown }) => {
          slotClaims += 1;
          slotRender = claim.render;
          return () => undefined;
        },
      },
    };

    const cleanup = await Reflect.apply(definition.setup, undefined, [context]);
    if (typeof cleanup !== "function" || !triggerReload || !slotRender) throw new Error("Expected active setup");
    slotRender();
    if (!accessors) throw new Error("Expected mounted accessors");
    expect(accessors.getState().kind).toBe("missing");
    expect(accessors.getCollapsedState()).toEqual({});

    await triggerReload();
    expect(accessors.getCollapsedState()).toEqual({ Research: true });
    expect(accessors.getSectionCollapsed()).toBe(true);
    accessors.onToggleCategory("Research");
    accessors.onToggleAgent("oracle");
    await triggerReload();

    expect(accessors.getCollapsedState()).toEqual({ Research: false });
    expect(accessors.getSelectedAgent()).toBe("oracle");
    expect(slotClaims).toBe(1);
    expect(updates).toHaveLength(3);
    await cleanup();
    expect(watcherDisposals).toBe(1);
  });

  test("cleanup blocks a delayed reload from publishing state or updating watches", async () => {
    let resolveLate: ((state: SidebarRuntimeState) => void) | undefined;
    const late = new Promise<SidebarRuntimeState>((resolve) => { resolveLate = resolve; });
    let reads = 0;
    let triggerReload: (() => Promise<void>) | undefined;
    let accessors: SidebarAccessors | undefined;
    let slotDisposals = 0;
    const updates: string[][] = [];
    const definition = createAgentsTuiDefinition({
      loadRuntimeState: async () => ++reads === 1 ? missingState("initial") : late,
      createWatcher: (reload) => {
        triggerReload = reload;
        return {
          update: (paths) => { updates.push([...paths]); },
          dispose: () => undefined,
        };
      },
      mountPanel: (nextAccessors) => {
        accessors = nextAccessors;
        return {} as never;
      },
    });
    const cleanup = await Reflect.apply(definition.setup, undefined, [{
      theme: theme("light"),
      ui: { slot: (claim: { render: () => unknown }) => { claim.render(); return () => { slotDisposals += 1; }; } },
    }]);
    if (typeof cleanup !== "function" || !triggerReload || !accessors) throw new Error("Expected active setup");

    const pending = triggerReload();
    await settle();
    await cleanup();
    resolveLate?.(loadedState("late", ["Research"]));
    await pending;

    expect(accessors.getState().fingerprint).toBe("initial");
    expect(updates).toHaveLength(1);
    expect(slotDisposals).toBe(1);
  });
});
