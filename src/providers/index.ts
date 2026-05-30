import { homedir } from "node:os";
import { mergeAgentSources } from "../agents/merge.js";
import type { AgentEntry } from "../agents/types.js";
import { customProvider } from "./custom.js";
import { omoProvider } from "./omo.js";
import type { AgentProviderContext, AgentSourceState } from "./types.js";

export * from "./custom.js";
export * from "./omo.js";
export * from "./types.js";

export interface LoadedAgentSources {
  sources: AgentSourceState[];
  agents: AgentEntry[];
}

export async function loadAgentSources(context: Partial<AgentProviderContext> = {}): Promise<LoadedAgentSources> {
  const providerContext: AgentProviderContext = {
    options: context.options,
    meta: context.meta,
    homeDir: context.homeDir ?? homedir(),
    cwd: context.cwd,
  };
  const sources = await Promise.all([
    omoProvider.load(providerContext),
    customProvider.load(providerContext),
  ]);
  return { sources, agents: mergeAgentSources(sources) };
}
