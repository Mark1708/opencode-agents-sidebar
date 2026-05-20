import { createElement, insert, setProp } from "@opentui/solid";
import type { JSX } from "@opentui/solid";
import { watch } from "node:fs";
import { createSignal } from "solid-js";
import type { TuiPluginModule } from "@opencode-ai/plugin/tui";
import { DEFAULTS } from "./defaults.js";
import { CONFIG_PATH, configFingerprint, mergeConfig, readConfigAsync } from "./config.js";
import { buildAgentList, filterAgents, groupByCategory } from "./agents.js";
import { compactAgentLine, formatDetailLine, formatFullModelRef, formatSplitAgentLines, initialSectionCollapsed, truncateTo } from "./format.js";
import type { AgentEntry, AgentRowMode, CategoryGroup, Child, ConfigState, HeaderStats, ModelDisplay, OmoConfig, SidebarConfig, SymbolMode, TextTheme } from "./types.js";

const WATCH_DEBOUNCE_MS = 100;

type Watcher = ReturnType<typeof watch>;
type Timer = ReturnType<typeof setInterval>;

function element(tag: string, props: Record<string, unknown>, children: Child[] = []): JSX.Element {
  const node = createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) setProp(node, key, value);
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) insert(node, child);
  }
  return node as JSX.Element;
}

function text(props: Record<string, unknown>, children: Child[]): JSX.Element {
  return element("text", props, children);
}

function box(props: Record<string, unknown>, children: Child[] = []): JSX.Element {
  return element("box", props, children);
}

interface PluginApiLike {
  renderer: { requestRender: () => void };
  lifecycle: { onDispose: (callback: () => void) => void };
  slots: { register: (options: { order: number; slots: { sidebar_content: () => JSX.Element } }) => void };
  theme: { current: TextTheme };
}

export function renderText(value: string, color: unknown): JSX.Element {
  return text({ fg: color }, [value]);
}

export function renderHeader(
  config: OmoConfig,
  mergedConfig: SidebarConfig,
  stats: HeaderStats,
  theme: TextTheme,
  isSectionCollapsed: boolean,
  onToggleSection: () => void,
): JSX.Element[] {
  const marker = isSectionCollapsed ? "▶" : "▼";
  const parts = [`${stats.visibleCount} active`, ...optionalHeaderParts(stats)];
  const summary = parts.join(", ");
  return [box({ width: "100%", flexDirection: "column", onMouseDown: onToggleSection }, [
    renderText(truncateTo(`${marker} ${mergedConfig.title} (${summary})`, mergedConfig.sidebar_width), theme.text),
    !isSectionCollapsed ? renderText(renderStatusLine(config, stats), theme.textMuted) : null,
  ])];
}

function optionalHeaderParts(stats: HeaderStats): string[] {
  return [
    stats.disabledCount > 0 ? `${stats.disabledCount} disabled` : "",
    stats.unmappedCount > 0 ? `${stats.unmappedCount} unmapped` : "",
  ].filter((part) => part.length > 0);
}

export function renderStatusLine(config: OmoConfig, stats: HeaderStats): string {
  const showTeam = config.tui?.show_team_status ?? true;
  const showTmux = config.tui?.show_tmux_status ?? true;
  return [
    showTeam && config.team_mode?.enabled ? `team ${config.team_mode.max_parallel_members ?? "?"}/${config.team_mode.max_members ?? "?"}` : "",
    showTmux && config.tmux?.enabled ? `tmux ${config.tmux.main_pane_size ?? "?"}` : "",
    stats.disabledCount > 0 ? `disabled ${stats.disabledCount}` : "",
    stats.unmappedCount > 0 ? `unmapped ${stats.unmappedCount}` : "",
  ].filter((part) => part.length > 0).join(" · ");
}

export function renderCategoryGroup(group: CategoryGroup, options: RenderGroupOptions): JSX.Element {
  const header = renderCategoryHeader(group, options);
  const agentRows = options.isCollapsed ? [] : group.agents.map((agent) => renderAgentBlock(agent, options));
  return box({ width: "100%", flexDirection: "column" }, [header, ...agentRows]);
}

interface RenderGroupOptions extends RenderAgentOptions {
  isCollapsed: boolean;
  onToggleCategory: () => void;
}

interface RenderAgentOptions {
  showProvider: boolean;
  selectedAgent: string | null;
  agentRowMode: AgentRowMode;
  modelDisplay: ModelDisplay;
  showVariantInDetails: boolean;
  symbols: SymbolMode;
  config: SidebarConfig;
  onToggleAgent: (name: string) => void;
  theme: TextTheme;
}

export function renderCategoryHeader(group: CategoryGroup, options: RenderGroupOptions): JSX.Element {
  const catMarker = options.isCollapsed ? "▶" : "▼";
  const label = `${catMarker} ${group.category} (${group.agents.length})`;
  return box({ width: "100%", onMouseDown: options.onToggleCategory }, [
    renderText(truncateTo(label, options.config.sidebar_width), options.theme.accent),
  ]);
}

export function renderAgentBlock(agent: AgentEntry, options: RenderAgentOptions): JSX.Element {
  const isSelected = options.selectedAgent === agent.name;
  const color = agent.disabled ? options.theme.textMuted : options.theme.text;
  const details = isSelected ? renderAgentDetails(agent, options.theme, options.modelDisplay, options.showVariantInDetails, options.config) : [];
  return box({ width: "100%", flexDirection: "column", onMouseDown: () => options.onToggleAgent(agent.name) }, [
    ...renderAgentRows(agent, options, isSelected, color),
    ...details,
  ]);
}

function renderAgentRows(agent: AgentEntry, options: RenderAgentOptions, selected: boolean, color: unknown): JSX.Element[] {
  if (options.agentRowMode !== "split") {
    return [renderText(compactAgentLine(agent, options.showProvider, selected, options.symbols, options.modelDisplay, options.config), color)];
  }
  const splitLines = formatSplitAgentLines(agent, {
    width: options.config.sidebar_width,
    selected,
    symbols: options.symbols,
    modelDisplay: options.modelDisplay,
    config: options.config,
  });
  return [splitLines.name, splitLines.detail].map((line) => renderText(line, color));
}

export function renderAgentDetails(agent: AgentEntry, theme: TextTheme, modelDisplay: ModelDisplay, showVariant: boolean, config: SidebarConfig): JSX.Element[] {
  const width = Math.max(0, config.sidebar_width + 2);
  if (modelDisplay === "hidden") return [renderText(truncateTo(`    mode ${agent.mode ?? "—"}`, width), theme.textMuted)];
  const primary = agent.modelSource === "primary" ? formatFullModelRef(agent.model, agent.variant, { showVariant }) : "—";
  const lines = [
    truncateTo(`    mode ${agent.mode ?? "—"}`, width),
    formatDetailLine("1°", primary, width),
    ...agent.fallbacks.map((fb) => formatDetailLine("fb", formatFullModelRef(fb.model, fb.variant, { showVariant }), width)),
  ];
  return lines.map((line) => renderText(line, theme.textMuted));
}

export function renderErrorState(state: Exclude<ConfigState, { kind: "loaded" }>, theme: TextTheme): JSX.Element {
  const title = state.kind === "missing" ? "OmO not configured" : "▼ OmO Agents (config error)";
  const lines = state.kind === "invalid" ? [title, state.path, state.error] : [title, state.path];
  return renderPanel(lines.map((line) => renderText(line, theme.textMuted)), theme);
}

export function renderPanel(children: Child[], _theme: TextTheme): JSX.Element {
  return box({ width: "100%", flexDirection: "column", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }, children);
}

export function renderSidebar(props: RenderSidebarProps): JSX.Element {
  const { state, theme } = props;
  if (state.kind !== "loaded") return renderErrorState(state, theme);
  const agents = buildAgentList(state.config);
  if (Object.keys(state.config.agents ?? {}).length === 0) return renderPanel([renderText("No agents found", theme.textMuted)], theme);
  if (agents.length === 0) return renderPanel([renderText("All agents hidden or disabled", theme.textMuted)], theme);
  return renderLoadedSidebar(props, agents);
}

interface RenderSidebarProps {
  state: ConfigState;
  collapsedState: Record<string, boolean>;
  selectedAgent: string | null;
  isSectionCollapsed: boolean;
  searchMode: boolean;
  searchQuery: string;
  toggleCategory: (category: string) => void;
  toggleAgent: (name: string) => void;
  toggleSection: () => void;
  theme: TextTheme;
}

function renderLoadedSidebar(props: RenderSidebarProps, agents: AgentEntry[]): JSX.Element {
  if (props.state.kind !== "loaded") return renderErrorState(props.state, props.theme);
  const loadedConfig = props.state.config;
  const mergedConfig = mergeConfig(loadedConfig.tui);
  const visibleAgents = filterAgents(agents, props.searchQuery);
  const stats = buildHeaderStats(visibleAgents);
  const groups = groupByCategory(visibleAgents, loadedConfig);
  const body = groups.map((group) => renderCategoryGroup(group, groupOptions(group, props, mergedConfig)));
  const header = renderHeader(loadedConfig, mergedConfig, stats, props.theme, props.isSectionCollapsed, props.toggleSection);
  const search = props.searchMode ? [renderSearchBar(props.searchQuery, mergedConfig, props.theme)] : [];
  return renderPanel(props.isSectionCollapsed ? [...header, ...search] : [...header, ...search, null, ...body], props.theme);
}

function groupOptions(group: CategoryGroup, props: RenderSidebarProps, config: SidebarConfig): RenderGroupOptions {
  return {
    isCollapsed: props.collapsedState[group.category] ?? false,
    showProvider: config.show_provider,
    selectedAgent: props.selectedAgent,
    agentRowMode: config.agent_row_mode,
    modelDisplay: config.model_display,
    showVariantInDetails: config.show_variant_in_details,
    symbols: config.symbols,
    config,
    onToggleCategory: () => props.toggleCategory(group.category),
    onToggleAgent: props.toggleAgent,
    theme: props.theme,
  };
}

function renderSearchBar(query: string, config: SidebarConfig, theme: TextTheme): JSX.Element {
  const label = truncateTo(`> ${query}_`, config.sidebar_width);
  return box({ width: "100%" }, [renderText(label.slice(0, 1), theme.accent), renderText(label.slice(1), theme.text)]);
}

export function buildHeaderStats(agents: AgentEntry[]): HeaderStats {
  return {
    visibleCount: agents.length,
    disabledCount: agents.filter((agent) => agent.disabled).length,
    unmappedCount: agents.filter((agent) => agent.unmapped).length,
  };
}

function debounce(callback: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(callback, delayMs);
  };
}

function createReload(api: PluginApiLike, _state: () => ConfigState, setState: (next: ConfigState) => void, fingerprint: () => string, setFingerprint: (next: string) => void): () => void {
  return () => void (async () => {
    try {
      const nextState = await readConfigAsync();
      const nextFingerprint = configFingerprint(nextState);
      if (nextFingerprint === fingerprint()) return;
      setState(nextState);
      setFingerprint(nextFingerprint);
      api.renderer.requestRender();
    } catch (_err: unknown) {
      return;
    }
  })();
}

function registerConfigWatcher(reload: () => void, fallbackMs: number): { watcher?: Watcher; fallbackTimer?: Timer } {
  const debouncedReload = debounce(reload, WATCH_DEBOUNCE_MS);
  try {
    const watcher = watch(CONFIG_PATH, { persistent: false }, (event: string) => {
      if (event === "change" || event === "rename") debouncedReload();
    });
    return { watcher };
  } catch (_err: unknown) {
    return { fallbackTimer: setInterval(reload, fallbackMs) };
  }
}

const plugin: TuiPluginModule & { id: string } = {
  id: "agents-sidebar:tui",
  tui: async (api, _options, _meta) => {
    let currentState: ConfigState;
    try {
      currentState = await readConfigAsync();
    } catch (_err: unknown) {
      return;
    }
    let lastFingerprint = configFingerprint(currentState);
    let collapsedInitialized = false;
    const initialConfig = currentState.kind === "loaded" ? mergeConfig(currentState.config.tui) : DEFAULTS;
    const [getCollapsedMap, setCollapsedMap] = createSignal<Record<string, boolean>>({});
    const [getSelectedAgent, setSelectedAgent] = createSignal<string | null>(null);
    const [isSectionCollapsed, setSectionCollapsed] = createSignal(false);
    const [searchMode, _setSearchMode] = createSignal(false);
    const [searchQuery, _setSearchQuery] = createSignal("");
    const initializeCollapsed = (state: ConfigState): void => {
      if (collapsedInitialized || state.kind !== "loaded") return;
      collapsedInitialized = true;
      setCollapsedMap(Object.fromEntries((state.config.tui?.default_collapsed ?? DEFAULTS.default_collapsed).map((name) => [name, true])));
      setSectionCollapsed(initialSectionCollapsed(state.config));
    };
    initializeCollapsed(currentState);
  const setState = (next: ConfigState): void => { currentState = next; initializeCollapsed(next); };
    const setFingerprint = (next: string): void => { lastFingerprint = next; };
    const requestRender = (): void => api.renderer.requestRender();
    const watcherState = registerConfigWatcher(createReload(api, () => currentState, setState, () => lastFingerprint, setFingerprint), initialConfig.poll_interval_ms);
    const toggleCategory = (category: string): void => {
      setCollapsedMap({ ...getCollapsedMap(), [category]: !(getCollapsedMap()[category] ?? false) });
      requestRender();
    };
    const toggleAgent = (name: string): void => {
      setSelectedAgent(getSelectedAgent() === name ? null : name);
      requestRender();
    };
    const toggleSectionCollapsed = (): void => {
      setSectionCollapsed(!isSectionCollapsed());
      requestRender();
    };
    api.lifecycle.onDispose(() => {
      watcherState.watcher?.close();
      if (watcherState.fallbackTimer !== undefined) clearInterval(watcherState.fallbackTimer);
    });
    api.slots.register({
      order: initialConfig.slot_order,
      slots: {
        sidebar_content: () => {
          try {
            const theme = api.theme.current as TextTheme & { error: unknown };
            const result = renderSidebar({
              state: currentState,
              collapsedState: getCollapsedMap(),
              selectedAgent: getSelectedAgent(),
              isSectionCollapsed: isSectionCollapsed(),
              searchMode: searchMode(),
              searchQuery: searchQuery(),
              toggleCategory,
              toggleAgent,
              toggleSection: toggleSectionCollapsed,
              theme,
            });
            return result;
          } catch (renderErr: unknown) {
            const theme = api.theme.current as TextTheme & { error: unknown };
            return box({ width: "100%" }, [text({ fg: theme.error }, [`agents-sidebar render error: ${String(renderErr).slice(0, 60)}`])]);
          }
        },
      },
    });
  },
};

export default plugin;
