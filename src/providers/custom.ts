import type { AgentProvider } from "./types.js";
import { emptySourceState } from "./types.js";

export const customProvider: AgentProvider = {
  source: "custom",
  load: async () => emptySourceState("custom"),
};
