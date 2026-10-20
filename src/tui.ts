import { Plugin } from "@opencode/plugin/tui";
import { createSignal } from "solid-js";
import {
  createConfigWatcher,
  type ConfigWatcher,
} from "./config-watcher.js";
import {
  mountSidebar,
  type ResolvedThemeLike,
  type SidebarAccessors,
  type SidebarMountNode,
} from "./render.js";
import {
  createReloadController,
  loadSidebarRuntimeState,
  type ReloadController,
  type SidebarRuntimeState,
  type WatchSpec,
} from "./runtime.js";

export type { SidebarAccessors } from "./render.js";

type AgentsTuiDependencies = Readonly<{
  loadRuntimeState(fallbackWatchSpec?: WatchSpec): Promise<SidebarRuntimeState>;
  createWatcher(reload: () => Promise<void>): ConfigWatcher;
  mountPanel(accessors: SidebarAccessors): SidebarMountNode;
}>;

const DEFAULT_DEPENDENCIES: AgentsTuiDependencies = {
  loadRuntimeState: (fallbackWatchSpec) => loadSidebarRuntimeState({ fallbackWatchSpec }),
  createWatcher: (reload) => createConfigWatcher(reload),
  mountPanel: (accessors) => mountSidebar(accessors),
};

export function createAgentsTuiDefinition(
  overrides: Partial<AgentsTuiDependencies> = {},
): Plugin.Definition {
  const dependencies: AgentsTuiDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };
  return Plugin.define({
    id: "agents-sidebar.tui",
    async setup(context) {
      let disposed = false;
      const initialState = await dependencies.loadRuntimeState();
      const [getState, setState] = createSignal<SidebarRuntimeState>(initialState);
      const [getCollapsedState, setCollapsedState] = createSignal<Record<string, boolean>>({});
      const [getSelectedAgent, setSelectedAgent] = createSignal<string | null>(null);
      const [getSectionCollapsed, setSectionCollapsed] = createSignal(false);
      let collapseInitialized = false;

      const initializeCollapse = (state: SidebarRuntimeState): void => {
        if (collapseInitialized || state.kind !== "loaded") return;
        collapseInitialized = true;
        setCollapsedState(Object.fromEntries(
          state.defaultCollapsed.map((category) => [category, true]),
        ));
        setSectionCollapsed(state.defaultSectionCollapsed);
      };
      initializeCollapse(initialState);

      let controller: ReloadController | undefined;
      const watcher = dependencies.createWatcher(
        () => controller?.request() ?? Promise.resolve(),
      );
      controller = createReloadController({
        initialState,
        load: (fallbackWatchSpec) => dependencies.loadRuntimeState(fallbackWatchSpec),
        accept: (state) => {
          if (disposed) return;
          setState(state);
          initializeCollapse(state);
          watcher.update(state.watchSpec.paths, state.watchSpec.pollIntervalMs);
        },
      });
      watcher.update(initialState.watchSpec.paths, initialState.watchSpec.pollIntervalMs);

      const toggleCategory = (category: string): void => {
        setCollapsedState((current) => ({
          ...current,
          [category]: !(current[category] ?? false),
        }));
      };
      const toggleAgent = (name: string): void => {
        setSelectedAgent((current) => current === name ? null : name);
      };
      const toggleSection = (): void => {
        setSectionCollapsed((current) => !current);
      };

      const unregisterSlot = context.ui.slot({
        append: "sidebar.content",
        render: () => dependencies.mountPanel({
          getState,
          getCollapsedState,
          getSelectedAgent,
          getSectionCollapsed,
          onToggleCategory: toggleCategory,
          onToggleAgent: toggleAgent,
          onToggleSection: toggleSection,
          getTheme: () => context.theme as unknown as ResolvedThemeLike,
        }),
      });

      return () => {
        if (disposed) return;
        disposed = true;
        controller?.dispose();
        unregisterSlot();
        watcher.dispose();
      };
    },
  });
}

const plugin = createAgentsTuiDefinition();

export default plugin;
