export type Child = unknown | string | number | null | undefined | false;
export type ModelSource = "primary" | "fallback" | "none";
export type ShowDisabledMode = "hidden" | "dimmed" | "grouped";
export type AgentRowMode = "compact" | "split";
export type AliasMap = Record<string, string>;
export type ModelDisplay = "inline" | "details-only" | "hidden";
export type SymbolMode = "unicode" | "ascii";

export interface SidebarConfig {
  sidebar_width: number;
  name_width: number;
  poll_interval_ms: number;
  slot_order: number;
  title: string;
  category_order: string[];
  model_display: ModelDisplay;
  show_provider: boolean;
  show_variant_in_details: boolean;
  show_disabled: ShowDisabledMode;
  agent_row_mode: AgentRowMode;
  symbols: SymbolMode;
  provider_aliases: AliasMap;
  model_aliases: AliasMap;
  variant_aliases: AliasMap;
}

export interface TextTheme {
  accent: unknown;
  background: unknown;
  borderActive: unknown;
  text: unknown;
  textMuted: unknown;
}

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
  team_mode?: {
    enabled?: boolean;
    tmux_visualization?: boolean;
    max_parallel_members?: number;
    max_members?: number;
    max_messages_per_run?: number;
    max_wall_clock_minutes?: number;
    max_member_turns?: number;
  };
  tmux?: {
    enabled?: boolean;
    main_pane_size?: number;
  };
  tui?: {
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
  };
}

export interface AgentEntry {
  name: string;
  category: string;
  model: string;
  variant?: string;
  modelSource: ModelSource;
  fallbackCount: number;
  fallbacks: Array<{ model: string; variant?: string }>;
  mode?: string;
  disabled: boolean;
  hidden: boolean;
  unmapped: boolean;
}

export type ConfigState =
  | { kind: "loaded"; config: OmoConfig; path: string }
  | { kind: "missing"; path: string }
  | { kind: "invalid"; path: string; error: string };

export interface CategoryGroup {
  category: string;
  agents: AgentEntry[];
  hasUnmapped: boolean;
}

export interface HeaderStats {
  visibleCount: number;
  disabledCount: number;
  unmappedCount: number;
}

export interface SplitAgentLines {
  name: string;
  detail: string;
  [Symbol.iterator](): Iterator<string>;
}
