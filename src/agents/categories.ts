import { DEFAULTS, DISABLED_CATEGORY } from "../defaults.js";
import type { AgentEntry, CategoryGroup } from "./types.js";
import type { SidebarConfig } from "../types.js";

export const CUSTOM_CATEGORY = "Custom";
export const OTHER_CATEGORY = "Other";

export function resolveGenericCategory(agent: AgentEntry): string {
  if (agent.category) return agent.category;
  if (agent.source === "custom") return CUSTOM_CATEGORY;
  return OTHER_CATEGORY;
}

export function groupByCategory(agents: AgentEntry[], config: Pick<SidebarConfig, "category_order"> = DEFAULTS): CategoryGroup[] {
  const preferred = config.category_order;
  const categories = [...new Set(agents.map((agent) => agent.category))];
  const orderedExtras = categories
    .filter((category) => !preferred.includes(category))
    .sort((left, right) => left.localeCompare(right));
  return [...preferred, ...orderedExtras]
    .map((category) => ({
      category,
      agents: agents.filter((agent) => agent.category === category),
      hasUnmapped: category === OTHER_CATEGORY && agents.some((agent) => agent.category === OTHER_CATEGORY),
    }))
    .filter((group) => group.agents.length > 0);
}

export function categoryForDisabled(agent: AgentEntry, showDisabled: "hidden" | "dimmed" | "grouped"): string {
  return agent.disabled && showDisabled === "grouped" ? DISABLED_CATEGORY : resolveGenericCategory(agent);
}
