import type { AgentEntry } from "./types.js";
import type { AgentSourceState } from "../providers/types.js";

export function mergeAgentSources(states: AgentSourceState[]): AgentEntry[] {
  const merged = new Map<string, AgentEntry>();
  for (const state of states) {
    for (const agent of state.agents) {
      const key = canonicalAgentKey(agent);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, agent);
        continue;
      }
      merged.set(key, mergeDuplicateAgent(existing, agent));
    }
  }
  return [...merged.values()];
}

function canonicalAgentKey(agent: AgentEntry): string {
  return agent.name.trim().replaceAll("_", "-").toLowerCase();
}

function mergeDuplicateAgent(existing: AgentEntry, next: AgentEntry): AgentEntry {
  if (next.source === "custom") return withDuplicateWarning(next, existing);
  if (existing.source === "custom") return withDuplicateWarning(existing, next);
  if (existing.source === "opencode") return withDuplicateWarning(existing, next);
  if (next.source === "opencode") return withDuplicateWarning(next, existing);
  return withDuplicateWarning(existing, next);
}

function withDuplicateWarning(winner: AgentEntry, duplicate: AgentEntry): AgentEntry {
  return {
    ...winner,
    warnings: [
      ...(winner.warnings ?? []),
      {
        code: "duplicate-agent",
        severity: "warning",
        message: `Duplicate agent '${duplicate.name}' from ${duplicate.source} was ignored`,
        source: winner.source,
        agentId: winner.id ?? winner.name,
        metadata: { duplicateSource: duplicate.source, duplicateOrigin: duplicate.origin },
      },
    ],
  };
}
