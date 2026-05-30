import { createElement, insert, setProp } from "@opentui/solid";
import type { JSX } from "@opentui/solid";
import { watch } from "node:fs";
import { createSignal } from "solid-js";
import type { TuiPluginModule } from "@opencode-ai/plugin/tui";
import { DEFAULTS } from "./defaults.js";
import { mergeConfig } from "./config.js";
import { buildSidebarViewState, filterAgents, groupByCategory } from "./agents.js";
import { agentFallbacks, agentVariant, compactAgentLine, formatDetailLine, formatFullModelRef, formatSplitAgentLines, truncateTo } from "./format.js";
import { loadAgentSources } from "./providers/index.js";
import type { AgentEntry, AgentRowMode, CategoryGroup, Child, DiagnosticWarning, HeaderStats, ModelDisplay, ProviderStatusState, SidebarConfig, SidebarViewState, SymbolMode, TextTheme } from "./types.js";
import type { AgentSourceState } from "./providers/types.js";

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
  mergedConfig: SidebarConfig,
  stats: HeaderStats,
  providerStatus: ProviderStatusState,
  theme: TextTheme,
  isSectionCollapsed: boolean,
  onToggleSection: () => void,
): JSX.Element[] {
  const marker = isSectionCollapsed ? "▶" : "▼";
  const parts = [`${stats.visibleCount} active`, ...optionalHeaderParts(stats)];
  const summary = parts.join(", ");
  return [box({ width: "100%", flexDirection: "column", onMouseDown: onToggleSection }, [
    renderText(truncateTo(`${marker} ${mergedConfig.title} (${summary})`, mergedConfig.sidebar_width), theme.text),
    !isSectionCollapsed ? renderText(renderStatusLine(providerStatus, stats), theme.textMuted) : null,
  ])];
}

function optionalHeaderParts(stats: HeaderStats): string[] {
  return [
    stats.disabledCount > 0 ? `${stats.disabledCount} disabled` : "",
    stats.unmappedCount > 0 ? `${stats.unmappedCount} unmapped` : "",
    stats.warningCount > 0 ? `${stats.warningCount} warnings` : "",
  ].filter((part) => part.length > 0);
}

export function renderStatusLine(providerStatus: ProviderStatusState, stats: HeaderStats): string {
  return [
    providerStatus.showTeam && providerStatus.teamEnabled ? `team ${providerStatus.teamMaxParallelMembers ?? "?"}/${providerStatus.teamMaxMembers ?? "?"}` : "",
    providerStatus.showTmux && providerStatus.tmuxEnabled ? `tmux ${providerStatus.tmuxMainPaneSize ?? "?"}` : "",
    stats.disabledCount > 0 ? `disabled ${stats.disabledCount}` : "",
    stats.unmappedCount > 0 ? `unmapped ${stats.unmappedCount}` : "",
    stats.warningCount > 0 ? `warnings ${stats.warningCount}` : "",
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
  const primary = agent.modelSource === "explicit" ? formatFullModelRef(agent.model, agentVariant(agent), { showVariant }) : "—";
  const lines = [
    truncateTo(`    mode ${agent.mode ?? "—"}`, width),
    truncateTo(`    source ${agent.source}`, width),
    formatDetailLine("1°", primary, width),
    ...agentFallbacks(agent).map((fb) => formatDetailLine("fb", formatFullModelRef(fb.model, fb.variant, { showVariant }), width)),
  ];
  return lines.map((line) => renderText(line, theme.textMuted));
}

export function renderErrorState(error: string, theme: TextTheme): JSX.Element {
  const lines = ["Agents unavailable", error];
  return renderPanel(lines.map((line) => renderText(line, theme.textMuted)), theme);
}

export function renderPanel(children: Child[], _theme: TextTheme): JSX.Element {
  return box({ width: "100%", flexDirection: "column", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }, children);
}

export function renderSidebar(props: RenderSidebarProps): JSX.Element {
  return renderSidebarView({ ...props, state: props.state });
}

export function renderSidebarView(props: RenderSidebarViewProps): JSX.Element {
  const { state, theme } = props;
  if (state.kind !== "loaded") return renderErrorState(errorStateMessage(state), theme);
  if (state.diagnostics.some((diagnostic) => diagnostic.severity === "error")) return renderProviderDiagnostics(state.diagnostics, theme);
  if (!state.hasConfiguredAgents) return renderPanel([renderText("No agents found", theme.textMuted)], theme);
  const agents = state.agents;
  if (agents.length === 0) return renderPanel([renderText("All agents hidden or disabled", theme.textMuted)], theme);
  return renderLoadedSidebar(props, agents);
}

type SidebarRuntimeState =
  | (Extract<SidebarViewState, { kind: "loaded" }> & { watchedPaths: string[]; defaultCollapsed: string[]; sectionCollapsed: boolean })
  | { kind: "error"; error: string; config: SidebarConfig };

interface RenderSidebarProps {
  state: SidebarRuntimeState;
  collapsedState: Record<string, boolean>;
  selectedAgent: string | null;
  isSectionCollapsed: boolean;
  toggleCategory: (category: string) => void;
  toggleAgent: (name: string) => void;
  toggleSection: () => void;
  theme: TextTheme;
}

interface RenderSidebarViewProps extends Omit<RenderSidebarProps, "state"> {
  state: SidebarViewState | { kind: "error"; error: string; config: SidebarConfig };
}

function renderLoadedSidebar(props: RenderSidebarViewProps, agents: AgentEntry[]): JSX.Element {
  if (props.state.kind !== "loaded") return renderErrorState(errorStateMessage(props.state), props.theme);
  const mergedConfig = props.state.sidebarConfig;
  const visibleAgents = filterAgents(agents, "");
  const stats = buildHeaderStats(visibleAgents);
  const groups = groupByCategory(visibleAgents, mergedConfig);
  const body = groups.map((group) => renderCategoryGroup(group, groupOptions(group, props, mergedConfig)));
  const header = renderHeader(mergedConfig, stats, props.state.providerStatus, props.theme, props.isSectionCollapsed, props.toggleSection);
  return renderPanel(props.isSectionCollapsed ? [...header] : [...header, null, ...body], props.theme);
}

function groupOptions(group: CategoryGroup, props: RenderSidebarViewProps, config: SidebarConfig): RenderGroupOptions {
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

export function buildHeaderStats(agents: AgentEntry[]): HeaderStats {
  return {
    visibleCount: agents.length,
    disabledCount: agents.filter((agent) => agent.disabled).length,
    unmappedCount: agents.filter((agent) => agent.metadata.unmapped === true).length,
    warningCount: agents.reduce((count, agent) => count + (agent.warnings?.length ?? 0), 0),
  };
}

export function renderProviderDiagnostics(diagnostics: DiagnosticWarning[], theme: TextTheme): JSX.Element {
  const lines = [
    "Agents unavailable",
    ...diagnostics.map((diagnostic) => diagnosticLine(diagnostic)),
  ];
  return renderPanel(lines.map((line) => renderText(truncateTo(line, DEFAULTS.sidebar_width), theme.textMuted)), theme);
}

function diagnosticLine(diagnostic: DiagnosticWarning): string {
  return [diagnostic.source ?? "provider", diagnostic.code, diagnostic.message].filter((part) => part.length > 0).join(" · ");
}

function errorStateMessage(state: Exclude<RenderSidebarViewProps["state"], { kind: "loaded" }>): string {
  if (state.kind === "missing") return state.path;
  return state.error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function debounce(callback: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(callback, delayMs);
  };
}

function createReload(api: PluginApiLike, _state: () => SidebarRuntimeState, setState: (next: SidebarRuntimeState) => void, fingerprint: () => string, setFingerprint: (next: string) => void): () => void {
  return () => void (async () => {
    try {
      const nextState = await loadSidebarRuntimeState();
      const nextFingerprint = sidebarFingerprint(nextState);
      if (nextFingerprint === fingerprint()) return;
      setState(nextState);
      setFingerprint(nextFingerprint);
      api.renderer.requestRender();
    } catch (_err: unknown) {
      return;
    }
  })();
}

function registerConfigWatcher(paths: string[], reload: () => void, fallbackMs: number): { watchers: Watcher[]; fallbackTimer?: Timer } {
  const debouncedReload = debounce(reload, WATCH_DEBOUNCE_MS);
  const watchers: Watcher[] = [];
  try {
    for (const path of paths) {
      watchers.push(watch(path, { persistent: false }, (event: string) => {
        if (event === "change" || event === "rename") debouncedReload();
      }));
    }
    return { watchers };
  } catch (_err: unknown) {
    for (const watcher of watchers) watcher.close();
    return { watchers: [], fallbackTimer: setInterval(reload, fallbackMs) };
  }
}

async function loadSidebarRuntimeState(): Promise<SidebarRuntimeState> {
  try {
    const loaded = await loadAgentSources();
    const sidebarConfig = configFromSources(loaded.sources);
    const viewState = buildSidebarViewState(loaded.sources, sidebarConfig);
    if (viewState.kind !== "loaded") return { kind: "error", error: "Agent providers did not load", config: sidebarConfig };
    return {
      ...viewState,
      watchedPaths: loaded.sources.flatMap((source) => source.watchedPaths),
      defaultCollapsed: defaultCollapsedFromSources(loaded.sources),
      sectionCollapsed: sectionCollapsedFromSources(loaded.sources),
    };
  } catch (error: unknown) {
    return { kind: "error", error: error instanceof Error ? error.message : String(error), config: DEFAULTS };
  }
}

function configFromSources(sources: AgentSourceState[]): SidebarConfig {
  const tui = sources.find((source) => isRecord(source.metadata.tui))?.metadata.tui;
  return mergeConfig(tui);
}

function defaultCollapsedFromSources(sources: AgentSourceState[]): string[] {
  const tui = sources.find((source) => isRecord(source.metadata.tui))?.metadata.tui;
  if (!isRecord(tui) || !Array.isArray(tui.default_collapsed)) return DEFAULTS.default_collapsed;
  return tui.default_collapsed.every((item) => typeof item === "string") ? [...tui.default_collapsed] : DEFAULTS.default_collapsed;
}

function sectionCollapsedFromSources(sources: AgentSourceState[]): boolean {
  const tui = sources.find((source) => isRecord(source.metadata.tui))?.metadata.tui;
  return isRecord(tui) && typeof tui.default_agents_collapsed === "boolean" ? tui.default_agents_collapsed : false;
}

function sidebarFingerprint(state: SidebarRuntimeState): string {
  if (state.kind !== "loaded") return `error:${state.error}`;
  return JSON.stringify({ agents: state.agents, providerStatus: state.providerStatus, watchedPaths: state.watchedPaths });
}

const plugin: TuiPluginModule & { id: string } = {
  id: "agents-sidebar:tui",
  tui: async (api, _options, _meta) => {
    let currentState = await loadSidebarRuntimeState();
    let lastFingerprint = sidebarFingerprint(currentState);
    let collapsedInitialized = false;
    const initialConfig = currentState.kind === "loaded" ? currentState.sidebarConfig : currentState.config;
    const [getCollapsedMap, setCollapsedMap] = createSignal<Record<string, boolean>>({});
    const [getSelectedAgent, setSelectedAgent] = createSignal<string | null>(null);
    const [isSectionCollapsed, setSectionCollapsed] = createSignal(false);

    const initializeCollapsed = (state: SidebarRuntimeState): void => {
      if (collapsedInitialized || state.kind !== "loaded") return;
      collapsedInitialized = true;
      setCollapsedMap(Object.fromEntries(state.defaultCollapsed.map((name) => [name, true])));
      setSectionCollapsed(state.sectionCollapsed);
    };
    initializeCollapsed(currentState);
  const setState = (next: SidebarRuntimeState): void => { currentState = next; initializeCollapsed(next); };
    const setFingerprint = (next: string): void => { lastFingerprint = next; };
    const requestRender = (): void => api.renderer.requestRender();
    const watchedPaths = currentState.kind === "loaded" ? currentState.watchedPaths : [];
    const watcherState = registerConfigWatcher(watchedPaths, createReload(api, () => currentState, setState, () => lastFingerprint, setFingerprint), initialConfig.poll_interval_ms);
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
      for (const watcher of watcherState.watchers) watcher.close();
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
