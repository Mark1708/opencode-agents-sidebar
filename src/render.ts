import { createElement, insert, setProp } from "@opentui/solid";
import type { JSX } from "@opentui/solid";
import { DEFAULTS } from "./defaults.js";
import { sanitizeLine, shortError } from "./config.js";
import { filterAgents, groupByCategory } from "./agents.js";
import { agentFallbacks, agentVariant, compactAgentLine, formatDetailLine, formatFullModelRef, formatSplitAgentLines, truncateTo } from "./format.js";
import type { SidebarRuntimeState } from "./runtime.js";
import type { AgentEntry, AgentRowMode, CategoryGroup, Child, DiagnosticWarning, HeaderStats, ModelDisplay, ProviderStatusState, SidebarConfig, SidebarViewState, SymbolMode, TextTheme } from "./types.js";


function element(tag: string, props: Record<string, unknown>, children: Child[] = []): JSX.Element {
  const node = createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) setProp(node, key, value);
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) insert(node, child);
  }
  return node as unknown as JSX.Element;
}

function text(props: Record<string, unknown>, children: Child[]): JSX.Element {
  return element("text", props, children);
}

function box(props: Record<string, unknown>, children: Child[] = []): JSX.Element {
  return element("box", props, children);
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

export type ResolvedThemeLike = Readonly<{
  text: Readonly<{
    base: unknown;
    muted: unknown;
    feedback: Readonly<{
      warning: Readonly<{ base: unknown }>;
      error: Readonly<{ base: unknown }>;
    }>;
  }>;
  background: Readonly<{ base: unknown }>;
  border: Readonly<{ base: unknown }>;
}>;

export type SidebarAccessors = Readonly<{
  getState: () => SidebarRuntimeState;
  getCollapsedState: () => Record<string, boolean>;
  getSelectedAgent: () => string | null;
  getSectionCollapsed: () => boolean;
  onToggleCategory: (category: string) => void;
  onToggleAgent: (name: string) => void;
  onToggleSection: () => void;
  getTheme: () => ResolvedThemeLike;
}>;

export type SidebarRenderInput = Readonly<{
  state: SidebarRuntimeState;
  collapsedState: Record<string, boolean>;
  selectedAgent: string | null;
  isSectionCollapsed: boolean;
  toggleCategory: (category: string) => void;
  toggleAgent: (name: string) => void;
  toggleSection: () => void;
  theme: TextTheme;
}>;

export type SidebarMountNode = JSX.Element;

export interface SidebarMountAdapter<Node> {
  createContainer(): Node;
  insert(container: Node, accessor: () => unknown): void;
  render(input: SidebarRenderInput): unknown;
  renderError(message: string, theme: TextTheme): unknown;
}

const FALLBACK_THEME: TextTheme = {
  accent: undefined,
  background: undefined,
  borderActive: undefined,
  text: undefined,
  textMuted: undefined,
  error: undefined,
};

const DEFAULT_MOUNT_ADAPTER: SidebarMountAdapter<JSX.Element> = {
  createContainer: () => box({ width: "100%" }),
  insert: (container, accessor) => { insert(container, accessor); },
  render: (input) => renderSidebar(input),
  renderError: (message, theme) => box({ width: "100%" }, [
    text({ fg: theme.error ?? theme.textMuted }, [`agents-sidebar render error: ${message}`]),
  ]),
};

export function mountSidebar<Node = JSX.Element>(
  accessors: SidebarAccessors,
  adapter: SidebarMountAdapter<Node> = DEFAULT_MOUNT_ADAPTER as unknown as SidebarMountAdapter<Node>,
): Node {
  const container = adapter.createContainer();
  adapter.insert(container, () => {
    let theme = FALLBACK_THEME;
    try {
      theme = textThemeFrom(accessors.getTheme());
      return adapter.render({
        state: accessors.getState(),
        collapsedState: accessors.getCollapsedState(),
        selectedAgent: accessors.getSelectedAgent(),
        isSectionCollapsed: accessors.getSectionCollapsed(),
        toggleCategory: accessors.onToggleCategory,
        toggleAgent: accessors.onToggleAgent,
        toggleSection: accessors.onToggleSection,
        theme,
      });
    } catch (error: unknown) {
      return adapter.renderError(sanitizeLine(shortError(error)).slice(0, 80), theme);
    }
  });
  return container;
}

function textThemeFrom(theme: ResolvedThemeLike): TextTheme {
  return {
    accent: theme.text.feedback.warning.base,
    background: theme.background.base,
    borderActive: theme.border.base,
    error: theme.text.feedback.error.base,
    text: theme.text.base,
    textMuted: theme.text.muted,
  };
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


export interface RenderSidebarProps {
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
  state: SidebarRuntimeState | SidebarViewState;
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

