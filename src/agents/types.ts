export type AgentSource = "opencode" | "custom" | "oh-my-openagent";

export type AgentOrigin =
  | "builtin"
  | "global"
  | "project"
  | "workspace"
  | "managed"
  | "custom"
  | "unknown";

export type AgentMode = "primary" | "subagent" | "all" | "unknown";

export type ModelSource = "explicit" | "inherited" | "fallback" | "unknown";

export interface DiagnosticWarning {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  source?: AgentSource;
  agentId?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentEntry {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  source: AgentSource;
  origin: AgentOrigin;
  mode: AgentMode;
  category: string;
  model?: string;
  effectiveModel?: string;
  modelSource: ModelSource;
  disabled: boolean;
  hidden: boolean;
  permissions?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sourcePath?: string;
  warnings: DiagnosticWarning[];
}

export interface CategoryGroup {
  category: string;
  agents: AgentEntry[];
  hasUnmapped: boolean;
}

export interface HeaderStats {
  visibleCount: number;
  disabledCount: number;
  unmappedCount: number;
  warningCount: number;
}
