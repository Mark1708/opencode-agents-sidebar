import type { AgentEntry, DiagnosticWarning } from "./agents/types.js";
export type Child = unknown | string | number | null | undefined | false;
export type { AgentEntry, AgentMode, AgentOrigin, AgentSource, CategoryGroup, DiagnosticWarning, HeaderStats, ModelSource } from "./agents/types.js";
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

export type ConfigState =
  | { kind: "loaded"; config: Record<string, unknown>; path: string }
  | { kind: "missing"; path: string }
  | { kind: "invalid"; path: string; error: string };

export interface ProviderStatusState {
  showTeam: boolean;
  teamEnabled: boolean;
  teamMaxParallelMembers?: number;
  teamMaxMembers?: number;
  showTmux: boolean;
  tmuxEnabled: boolean;
  tmuxMainPaneSize?: number;
}

export type SidebarViewState =
  | {
    kind: "loaded";
    agents: AgentEntry[];
    hasConfiguredAgents: boolean;
    sidebarConfig: SidebarConfig;
    providerStatus: ProviderStatusState;
    diagnostics: DiagnosticWarning[];
  }
  | { kind: "missing"; path: string }
  | { kind: "invalid"; path: string; error: string };

export interface SplitAgentLines {
  name: string;
  detail: string;
  [Symbol.iterator](): Iterator<string>;
}
