import type { AgentEntry, AgentSource, DiagnosticWarning } from "../agents/types.js";

export interface AgentSourceState {
  source: AgentSource;
  agents: AgentEntry[];
  metadata: Record<string, unknown>;
  warnings: DiagnosticWarning[];
  errors: DiagnosticWarning[];
  watchedPaths: string[];
}

export interface AgentProviderContext {
  options: unknown;
  meta: unknown;
  homeDir: string;
  cwd?: string;
}

export interface AgentProvider {
  source: AgentSource;
  load(context: AgentProviderContext): Promise<AgentSourceState>;
}

export function emptySourceState(source: AgentSource): AgentSourceState {
  return {
    source,
    agents: [],
    metadata: {},
    warnings: [],
    errors: [],
    watchedPaths: [],
  };
}
