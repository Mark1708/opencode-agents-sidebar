import { DEFAULTS } from "./defaults.js";
import { groupByCategory as groupNormalizedByCategory } from "./agents/categories.js";
import { mergeAgentSources } from "./agents/merge.js";
import type { AgentEntry, CategoryGroup, DiagnosticWarning } from "./agents/types.js";
import type { AgentSourceState } from "./providers/types.js";
import type { ProviderStatusState, SidebarConfig, SidebarViewState } from "./types.js";
import { searchableAgentText } from "./format.js";

export function normalizeAgentName(name: string): string {
  return name.replaceAll("_", "-");
}

export function buildAgentList(sources: AgentSourceState[]): AgentEntry[] {
  return mergeAgentSources(sources);
}

export function buildSidebarViewState(sources: AgentSourceState[], config: SidebarConfig): SidebarViewState {
  return {
    kind: "loaded",
    agents: buildAgentList(sources),
    hasConfiguredAgents: sources.some((source) => configuredAgentCount(source) > 0),
    sidebarConfig: config,
    providerStatus: buildProviderStatusState(sources),
    diagnostics: collectProviderDiagnostics(sources),
  };
}

export function collectProviderDiagnostics(sources: AgentSourceState[]): DiagnosticWarning[] {
  return sources.flatMap((source) => [...source.errors, ...source.warnings]);
}

export function buildProviderStatusState(sources: AgentSourceState[]): ProviderStatusState {
  const omoSource = sources.find((source) => source.source === "oh-my-openagent");
  const tui = readRecord(omoSource?.metadata.tui);
  const teamMode = readRecord(omoSource?.metadata.team_mode);
  const tmux = readRecord(omoSource?.metadata.tmux);
  return {
    showTeam: booleanMetadata(tui.show_team_status, true),
    teamEnabled: booleanMetadata(teamMode.enabled, false),
    teamMaxParallelMembers: numberMetadata(teamMode.max_parallel_members),
    teamMaxMembers: numberMetadata(teamMode.max_members),
    showTmux: booleanMetadata(tui.show_tmux_status, true),
    tmuxEnabled: booleanMetadata(tmux.enabled, false),
    tmuxMainPaneSize: numberMetadata(tmux.main_pane_size),
  };
}

export function groupByCategory(agents: AgentEntry[], config: Pick<SidebarConfig, "category_order"> = DEFAULTS): CategoryGroup[] {
  return groupNormalizedByCategory(agents, config);
}

export function filterAgents(agents: AgentEntry[], query: string): AgentEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return agents;
  return agents.filter((agent) => searchableAgentText(agent).includes(normalizedQuery));
}

export function formatModelName(
  model: string | undefined,
  variant?: string,
  options: { showProvider?: boolean; modelSource?: AgentEntry["modelSource"]; config?: SidebarConfig } = {},
): string {
  if (!model) return "...";
  const config = options.config ?? DEFAULTS;
  const showProvider = options.showProvider ?? true;
  const modelRef = splitModelRefLocal(model);
  const formattedModel = showProvider && modelRef.provider
    ? `${shortAlias(modelRef.provider, config.provider_aliases)}/${modelRef.model}`
    : modelRef.model;
  const variantLabel = variant ? config.variant_aliases[variant] ?? "" : "";
  const sourcePrefix = options.modelSource === "fallback" ? "fb:" : "";
  return [`${sourcePrefix}${formattedModel}`, variantLabel].filter((part) => part.length > 0).join(" · ");
}

function splitModelRefLocal(model: string): { provider: string; model: string } {
  const slash = model.indexOf("/");
  if (slash === -1) return { provider: "", model };
  return { provider: model.slice(0, slash), model: model.slice(slash + 1) };
}

function shortAlias(value: string, aliases: Record<string, string>): string {
  return aliases[value] ?? value;
}

function configuredAgentCount(source: AgentSourceState): number {
  const value = source.metadata.configuredAgentCount;
  return typeof value === "number" && Number.isFinite(value) ? value : source.agents.length;
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanMetadata(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberMetadata(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
