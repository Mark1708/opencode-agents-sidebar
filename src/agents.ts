import { CATEGORY_MAP, DEFAULT_CATEGORY, DEFAULTS, DISABLED_CATEGORY } from "./defaults.js";
import { mergeConfig } from "./config.js";
import type { AgentConfig, AgentEntry, CategoryGroup, ModelSource, OmoConfig, SidebarConfig, ShowDisabledMode } from "./types.js";
import { searchableAgentText } from "./format.js";

export function normalizeAgentName(name: string): string {
  return name.replaceAll("_", "-");
}

export function getCategory(name: string, agent: AgentConfig = {}, config: OmoConfig = {}): string {
  const normalized = normalizeAgentName(name);
  return agent.category
    ?? config.tui?.agent_categories?.[name]
    ?? config.tui?.agent_categories?.[normalized]
    ?? CATEGORY_MAP[normalized]
    ?? DEFAULT_CATEGORY;
}

export function orderedAgentNames(config: OmoConfig): string[] {
  const agents = config.agents ?? {};
  const names = Object.keys(agents);
  const ordered = (config.agent_order ?? []).filter((name, index, source) => (
    agents[name] !== undefined && source.indexOf(name) === index
  ));
  const remaining = names
    .filter((name) => !ordered.includes(name))
    .sort((left, right) => left.localeCompare(right));
  return [...ordered, ...remaining];
}

export function resolveModel(agent: AgentConfig): Pick<AgentEntry, "model" | "variant" | "modelSource"> {
  const fallback = agent.fallback_models?.[0];
  if (agent.model) return { model: agent.model, variant: agent.variant, modelSource: "primary" };
  if (fallback?.model) return { model: fallback.model, variant: fallback.variant, modelSource: "fallback" };
  return { model: "", modelSource: "none" };
}

export function formatModelName(
  model: string | undefined,
  variant?: string,
  options: { showProvider?: boolean; modelSource?: ModelSource; config?: SidebarConfig } = {},
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

export function buildAgentList(config: OmoConfig): AgentEntry[] {
  const disabledNames = new Set(config.disabled_agents ?? []);
  const showDisabled = mergeConfig(config.tui).show_disabled;
  return orderedAgentNames(config).flatMap((name) => toAgentEntry(name, config, disabledNames, showDisabled));
}

function toAgentEntry(name: string, config: OmoConfig, disabledNames: Set<string>, showDisabled: ShowDisabledMode): AgentEntry[] {
  const agent = config.agents?.[name];
  if (!agent || agent.hidden) return [];
  const disabled = disabledNames.has(name);
  if (disabled && showDisabled === "hidden") return [];
  const resolvedCategory = getCategory(name, agent, config);
  const category = disabled && showDisabled === "grouped" ? DISABLED_CATEGORY : resolvedCategory;
  const model = resolveModel(agent);
  return [{
    name,
    category,
    model: model.model,
    variant: model.variant,
    modelSource: model.modelSource,
    fallbackCount: agent.fallback_models?.length ?? 0,
    fallbacks: agent.fallback_models ?? [],
    mode: agent.mode,
    disabled,
    hidden: agent.hidden ?? false,
    unmapped: category === DEFAULT_CATEGORY && resolvedCategory === DEFAULT_CATEGORY,
  }];
}

export function groupByCategory(agents: AgentEntry[], config: OmoConfig = {}): CategoryGroup[] {
  const preferred = mergeConfig(config.tui).category_order;
  const categories = [...new Set(agents.map((agent) => agent.category))];
  const orderedExtras = categories
    .filter((category) => !preferred.includes(category))
    .sort((left, right) => left.localeCompare(right));
  return [...preferred, ...orderedExtras]
    .map((category) => ({
      category,
      agents: agents.filter((agent) => agent.category === category),
      hasUnmapped: category === DEFAULT_CATEGORY && agents.some((agent) => agent.unmapped),
    }))
    .filter((group) => group.agents.length > 0);
}

export function filterAgents(agents: AgentEntry[], query: string): AgentEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return agents;
  return agents.filter((agent) => searchableAgentText(agent).includes(normalizedQuery));
}

function splitModelRefLocal(model: string): { provider: string; model: string } {
  const slash = model.indexOf("/");
  if (slash === -1) return { provider: "", model };
  return { provider: model.slice(0, slash), model: model.slice(slash + 1) };
}

function shortAlias(value: string, aliases: Record<string, string>): string {
  return aliases[value] ?? value;
}
