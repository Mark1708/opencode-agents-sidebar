import { homedir } from "node:os";
import { DEFAULTS, DISABLED_CATEGORY } from "../defaults.js";
import { readConfigAsync } from "../config.js";
import type { AgentEntry, AgentMode, ModelSource } from "../agents/types.js";
import type { AgentProvider, AgentProviderContext, AgentSourceState } from "./types.js";
import type { AgentRowMode, AliasMap, ModelDisplay, ShowDisabledMode, SymbolMode } from "../types.js";

export const OMO_CONFIG_PATH = `${homedir()}/.config/opencode/oh-my-openagent.json`;
const OMO_DEFAULT_CATEGORY = "Other";

export interface AgentConfig {
  model?: string;
  variant?: string;
  fallback_models?: Array<{ model: string; variant?: string }>;
  mode?: string;
  hidden?: boolean;
  category?: string;
}

export interface OmoConfig {
  agents?: Record<string, AgentConfig>;
  agent_order?: string[];
  disabled_agents?: string[];
  team_mode?: OmoTeamModeConfig;
  tmux?: OmoTmuxConfig;
  tui?: OmoTuiConfig;
}

export interface OmoTeamModeConfig {
  enabled?: boolean;
  tmux_visualization?: boolean;
  max_parallel_members?: number;
  max_members?: number;
  max_messages_per_run?: number;
  max_wall_clock_minutes?: number;
  max_member_turns?: number;
}

export interface OmoTmuxConfig {
  enabled?: boolean;
  main_pane_size?: number;
}

export interface OmoTuiConfig {
  agent_categories?: Record<string, string>;
  category_order?: string[];
  default_collapsed?: string[];
  compact?: boolean;
  show_provider?: boolean;
  show_disabled?: ShowDisabledMode;
  symbols?: SymbolMode;
  show_team_status?: boolean;
  show_tmux_status?: boolean;
  default_agents_collapsed?: boolean;
  agent_row_mode?: AgentRowMode;
  model_display?: ModelDisplay;
  show_variant_in_details?: boolean;
  sidebar_width?: number;
  name_width?: number;
  poll_interval_ms?: number;
  slot_order?: number;
  title?: string;
  provider_aliases?: AliasMap;
  model_aliases?: AliasMap;
  variant_aliases?: AliasMap;
}

const OMO_CATEGORY_MAP: Record<string, string> = {
  sisyphus: "Orchestration",
  hephaestus: "Orchestration",
  prometheus: "Orchestration",
  atlas: "Orchestration",
  "sisyphus-junior": "Orchestration",
  oracle: "Research",
  librarian: "Research",
  explore: "Research",
  metis: "Research",
  momus: "Research",
  "multimodal-looker": "Research",
  planner: "Architecture",
  architect: "Architecture",
  "code-architect": "Architecture",
  "code-reviewer": "Review",
  "typescript-reviewer": "Review",
  "frontend-reviewer": "Review",
  "ui-ux-reviewer": "Review",
  "python-reviewer": "Review",
  "go-reviewer": "Review",
  "rust-reviewer": "Review",
  "java-reviewer": "Review",
  "kotlin-reviewer": "Review",
  "security-auditor": "Review",
  "devops-reviewer": "Review",
  "backend-dev": "Engineering",
  "test-writer": "Engineering",
  "docs-writer": "Engineering",
  "build-error-resolver": "Operations",
  "frontend-build-resolver": "Operations",
  "e2e-runner": "Operations",
  "release-manager": "Operations",
  "database-specialist": "Operations",
  "data-analyst": "Analytics",
  "vision-processor": "Analytics",
  "health-consultant": "Consulting",
};

export const omoProvider: AgentProvider = {
  source: "oh-my-openagent",
  load: async (_context: AgentProviderContext) => loadOmoSourceState(),
};

export async function loadOmoSourceState(path = OMO_CONFIG_PATH): Promise<AgentSourceState> {
  const state = await readConfigAsync(path);
  if (state.kind === "missing") return emptyOmoState(path);
  if (state.kind === "invalid") {
    return {
      ...emptyOmoState(path),
      errors: [{ code: "omo-config-invalid", severity: "error", message: state.error, source: "oh-my-openagent", path }],
    };
  }
  return normalizeOmoConfig(coerceOmoConfig(state.config), path);
}

export function normalizeOmoConfig(config: OmoConfig, path = OMO_CONFIG_PATH): AgentSourceState {
  const showDisabled = config.tui?.show_disabled ?? DEFAULTS.show_disabled;
  const disabledNames = new Set(config.disabled_agents ?? []);
  const agents = orderedOmoAgentNames(config).flatMap((name) => normalizeOmoAgent(name, config, disabledNames, showDisabled));
  return {
    source: "oh-my-openagent",
    agents,
    metadata: {
      configuredAgentCount: Object.keys(config.agents ?? {}).length,
      team_mode: config.team_mode ?? {},
      tmux: config.tmux ?? {},
      tui: config.tui ?? {},
    },
    warnings: [],
    errors: [],
    watchedPaths: [path],
  };
}

export function orderedOmoAgentNames(config: OmoConfig): string[] {
  const agents = config.agents ?? {};
  const names = Object.keys(agents);
  const ordered = (config.agent_order ?? []).filter((name, index, source) => agents[name] !== undefined && source.indexOf(name) === index);
  const remaining = names.filter((name) => !ordered.includes(name)).sort((left, right) => left.localeCompare(right));
  return [...ordered, ...remaining];
}

function normalizeOmoAgent(name: string, config: OmoConfig, disabledNames: Set<string>, showDisabled: ShowDisabledMode): AgentEntry[] {
  const agent = config.agents?.[name];
  if (!agent || agent.hidden) return [];
  const disabled = disabledNames.has(name);
  if (disabled && showDisabled === "hidden") return [];
  const resolvedCategory = getOmoCategory(name, agent, config);
  const model = resolveOmoModel(agent);
  return [{
    id: `oh-my-openagent:${name}`,
    name,
    source: "oh-my-openagent",
    origin: "managed",
    mode: normalizeMode(agent.mode),
    category: disabled && showDisabled === "grouped" ? DISABLED_CATEGORY : resolvedCategory,
    model: model.model,
    effectiveModel: model.model,
    modelSource: model.modelSource,
    disabled,
    hidden: agent.hidden ?? false,
    metadata: {
      variant: model.variant,
      fallback_models: agent.fallback_models ?? [],
      fallbackCount: agent.fallback_models?.length ?? 0,
      rawMode: agent.mode,
      unmapped: resolvedCategory === OMO_DEFAULT_CATEGORY,
    },
    warnings: [],
  }];
}

export function normalizeAgentName(name: string): string {
  return name.replaceAll("_", "-");
}

export function getOmoCategory(name: string, agent: AgentConfig = {}, config: OmoConfig = {}): string {
  const normalized = normalizeAgentName(name);
  return agent.category
    ?? config.tui?.agent_categories?.[name]
    ?? config.tui?.agent_categories?.[normalized]
    ?? OMO_CATEGORY_MAP[normalized]
    ?? OMO_DEFAULT_CATEGORY;
}

function resolveOmoModel(agent: AgentConfig): { model?: string; variant?: string; modelSource: ModelSource } {
  const fallback = agent.fallback_models?.[0];
  if (agent.model) return { model: agent.model, variant: agent.variant, modelSource: "explicit" };
  if (fallback?.model) return { model: fallback.model, variant: fallback.variant, modelSource: "fallback" };
  return { modelSource: "unknown" };
}

function normalizeMode(mode: string | undefined): AgentMode {
  if (mode === "primary" || mode === "subagent" || mode === "all") return mode;
  return "unknown";
}

function emptyOmoState(path: string): AgentSourceState {
  return {
    source: "oh-my-openagent",
    agents: [],
    metadata: {},
    warnings: [],
    errors: [],
    watchedPaths: [path],
  };
}

function coerceOmoConfig(config: Record<string, unknown>): OmoConfig {
  return {
    agents: readAgents(config.agents),
    agent_order: readStringArray(config.agent_order),
    disabled_agents: readStringArray(config.disabled_agents),
    team_mode: readTeamMode(config.team_mode),
    tmux: readTmux(config.tmux),
    tui: readTui(config.tui),
  };
}

function readAgents(value: unknown): Record<string, AgentConfig> | undefined {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(Object.entries(value).flatMap(([name, agent]) => {
    const config = readAgentConfig(agent);
    return config ? [[name, config]] : [];
  }));
}

function readAgentConfig(value: unknown): AgentConfig | undefined {
  if (!isRecord(value)) return undefined;
  return {
    model: stringValue(value.model),
    variant: stringValue(value.variant),
    fallback_models: readFallbackModels(value.fallback_models),
    mode: stringValue(value.mode),
    hidden: booleanValue(value.hidden),
    category: stringValue(value.category),
  };
}

function readFallbackModels(value: unknown): Array<{ model: string; variant?: string }> | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.model !== "string") return [];
    return [{ model: item.model, variant: stringValue(item.variant) }];
  });
}

function readTeamMode(value: unknown): OmoTeamModeConfig | undefined {
  if (!isRecord(value)) return undefined;
  return {
    enabled: booleanValue(value.enabled),
    tmux_visualization: booleanValue(value.tmux_visualization),
    max_parallel_members: numberValue(value.max_parallel_members),
    max_members: numberValue(value.max_members),
    max_messages_per_run: numberValue(value.max_messages_per_run),
    max_wall_clock_minutes: numberValue(value.max_wall_clock_minutes),
    max_member_turns: numberValue(value.max_member_turns),
  };
}

function readTmux(value: unknown): OmoTmuxConfig | undefined {
  if (!isRecord(value)) return undefined;
  return {
    enabled: booleanValue(value.enabled),
    main_pane_size: numberValue(value.main_pane_size),
  };
}

function readTui(value: unknown): OmoTuiConfig | undefined {
  if (!isRecord(value)) return undefined;
  return {
    agent_categories: readStringRecord(value.agent_categories),
    category_order: readStringArray(value.category_order),
    default_collapsed: readStringArray(value.default_collapsed),
    compact: booleanValue(value.compact),
    show_provider: booleanValue(value.show_provider),
    show_disabled: showDisabledValue(value.show_disabled),
    symbols: symbolValue(value.symbols),
    show_team_status: booleanValue(value.show_team_status),
    show_tmux_status: booleanValue(value.show_tmux_status),
    default_agents_collapsed: booleanValue(value.default_agents_collapsed),
    agent_row_mode: agentRowModeValue(value.agent_row_mode),
    model_display: modelDisplayValue(value.model_display),
    show_variant_in_details: booleanValue(value.show_variant_in_details),
    sidebar_width: numberValue(value.sidebar_width),
    name_width: numberValue(value.name_width),
    poll_interval_ms: numberValue(value.poll_interval_ms),
    slot_order: numberValue(value.slot_order),
    title: stringValue(value.title),
    provider_aliases: readStringRecord(value.provider_aliases),
    model_aliases: readStringRecord(value.model_aliases),
    variant_aliases: readStringRecord(value.variant_aliases),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : undefined;
}

function readStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function showDisabledValue(value: unknown): ShowDisabledMode | undefined {
  return value === "hidden" || value === "dimmed" || value === "grouped" ? value : undefined;
}

function symbolValue(value: unknown): SymbolMode | undefined {
  return value === "unicode" || value === "ascii" ? value : undefined;
}

function agentRowModeValue(value: unknown): AgentRowMode | undefined {
  return value === "compact" || value === "split" ? value : undefined;
}

function modelDisplayValue(value: unknown): ModelDisplay | undefined {
  return value === "inline" || value === "details-only" || value === "hidden" ? value : undefined;
}
