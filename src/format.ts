import { DEFAULTS } from "./defaults.js";
import { sanitizeLine } from "./config.js";
import type { AgentEntry, AliasMap, ModelDisplay, OmoConfig, SidebarConfig, SplitAgentLines, SymbolMode } from "./types.js";

export function truncateTo(value: string, width: number): string {
  const normalizedWidth = Math.max(0, width);
  const line = sanitizeLine(value);
  if (normalizedWidth <= 0) return "";
  if (line.length <= normalizedWidth) return line;
  if (normalizedWidth === 1) return "…";
  return `${line.slice(0, normalizedWidth - 1)}…`;
}

export function padRight(value: string, width: number): string {
  const normalizedWidth = Math.max(0, width);
  const truncated = truncateTo(value, normalizedWidth);
  return truncated.padEnd(normalizedWidth, " ");
}

export function padLeft(value: string, width: number): string {
  const normalizedWidth = Math.max(0, width);
  const truncated = truncateTo(value, normalizedWidth);
  return truncated.padStart(normalizedWidth, " ");
}

export function formatHeaderLine(left: string, right: string, width: number): string {
  const normalizedWidth = Math.max(0, width);
  const leftLine = sanitizeLine(left);
  const rightLine = sanitizeLine(right);
  if (normalizedWidth <= 0) return "";
  if (rightLine.length >= normalizedWidth) return truncateTo(rightLine, normalizedWidth);
  const leftBudget = Math.max(0, normalizedWidth - rightLine.length);
  const safeLeft = leftLine.length > leftBudget ? truncateTo(leftLine, leftBudget) : leftLine;
  const padding = " ".repeat(Math.max(0, normalizedWidth - safeLeft.length - rightLine.length));
  return `${safeLeft}${padding}${rightLine}`;
}

export function shortProvider(provider: string, aliases: AliasMap = DEFAULTS.provider_aliases): string {
  return aliases[provider] ?? provider;
}

export function shortModel(model: string, aliases: AliasMap = DEFAULTS.model_aliases): string {
  return aliases[model] ?? model;
}

export function shortVariant(variant: string | undefined, aliases: AliasMap = DEFAULTS.variant_aliases): string {
  if (!variant) return "";
  return aliases[variant] ?? "";
}

export function splitModelRef(model: string | undefined): { provider: string; model: string } {
  if (!model) return { provider: "", model: "" };
  const slash = model.indexOf("/");
  if (slash === -1) return { provider: "", model };
  return { provider: model.slice(0, slash), model: model.slice(slash + 1) };
}

export function formatProvider(provider: string): string {
  if (provider === "zai-coding-plan") return "zai";
  return provider;
}

export function formatModel(model: string): string {
  if (model === "gpt-5.5") return "gpt-5.5";
  return shortModel(model);
}

export function formatVariant(variant: string | undefined, aliases: AliasMap = DEFAULTS.variant_aliases): string {
  return shortVariant(variant, aliases);
}

export function splitAgentLines(name: string, detail: string): SplitAgentLines {
  return {
    name,
    detail,
    *[Symbol.iterator](): Iterator<string> {
      yield name;
      yield detail;
    },
  };
}

export function formatSplitAgentLines(agent: AgentEntry, options: {
  width: number;
  selected: boolean;
  symbols: SymbolMode;
  modelDisplay?: ModelDisplay;
  config?: SidebarConfig;
}): SplitAgentLines {
  const config = options.config ?? DEFAULTS;
  const normalizedWidth = Math.max(0, options.width);
  const marker = options.selected ? (options.symbols === "ascii" ? ">" : "›") : " ";
  if (options.modelDisplay === "details-only" || options.modelDisplay === "hidden") {
    return splitAgentLines(padRight(`${marker} ${agent.name}`, normalizedWidth), " ".repeat(normalizedWidth));
  }
  return formatInlineSplitAgentLines(agent, config, marker, normalizedWidth);
}

function formatInlineSplitAgentLines(agent: AgentEntry, config: SidebarConfig, marker: string, width: number): SplitAgentLines {
  const fixedPrefix = `${marker} ${padRight(agent.name, config.name_width)}`;
  const rightWidth = Math.max(0, width - fixedPrefix.length);
  const modelRef = splitModelRef(agent.model);
  const provider = formatProvider(modelRef.provider);
  const sourcePrefix = agent.modelSource === "fallback" ? "fb:" : "";
  const model = agent.model ? `${sourcePrefix}${formatModel(modelRef.model)}` : "...";
  const variant = formatVariant(agent.variant, config.variant_aliases);
  const fallbackCount = agent.fallbackCount > 0 ? `+${agent.fallbackCount}` : "";
  const modelLine = [model, variant, fallbackCount].filter((part) => part.length > 0).join(" ");
  return splitAgentLines(
    truncateTo(`${fixedPrefix}${padLeft(provider, rightWidth)}`, width),
    truncateTo(`${" ".repeat(fixedPrefix.length)}${padLeft(modelLine, rightWidth)}`, width),
  );
}

export function compactModelLabel(agent: AgentEntry, showProvider = true, config: SidebarConfig = DEFAULTS): string {
  if (!agent.model) return "...";
  const sourcePrefix = agent.modelSource === "fallback" ? "fb:" : "";
  const modelRef = splitModelRef(agent.model);
  const modelName = shortModel(modelRef.model, config.model_aliases);
  const modelLabel = showProvider && modelRef.provider
    ? `${shortProvider(modelRef.provider, config.provider_aliases)}/${modelName}`
    : modelName;
  const variantLabel = shortVariant(agent.variant, config.variant_aliases);
  return variantLabel ? `${sourcePrefix}${modelLabel} ${variantLabel}` : `${sourcePrefix}${modelLabel}`;
}

export function formatAgentLine(agent: AgentEntry, options: {
  selected: boolean;
  symbols: SymbolMode;
  width: number;
  modelDisplay?: ModelDisplay;
  showProvider?: boolean;
  config?: SidebarConfig;
}): string {
  const config = options.config ?? DEFAULTS;
  const normalizedWidth = Math.max(0, options.width);
  const marker = options.selected ? (options.symbols === "ascii" ? ">" : "›") : " ";
  if (options.modelDisplay === "details-only" || options.modelDisplay === "hidden") {
    return padRight(`${marker} ${agent.name}`, normalizedWidth);
  }
  return formatInlineAgentLine(agent, options.showProvider ?? true, config, marker, normalizedWidth);
}

function formatInlineAgentLine(agent: AgentEntry, showProvider: boolean, config: SidebarConfig, marker: string, width: number): string {
  const name = padRight(agent.name, config.name_width);
  const fixedPrefix = `${marker} ${name}`;
  const suffix = agent.fallbackCount > 0 ? ` +${agent.fallbackCount}` : "";
  const remaining = Math.max(0, width - fixedPrefix.length);
  const safeSuffix = suffix.length > remaining ? truncateTo(suffix, remaining) : suffix;
  const modelBudget = Math.max(0, remaining - safeSuffix.length);
  const model = truncateTo(compactModelLabel(agent, showProvider, config), modelBudget);
  return truncateTo(`${fixedPrefix}${model}${safeSuffix}`, width);
}

export function formatDetailLine(label: string, value: string, width: number): string {
  return truncateTo(`    ${label}   ${value}`, Math.max(0, width));
}

export function searchableAgentText(agent: AgentEntry): string {
  return [
    agent.name,
    agent.category,
    agent.model,
    agent.variant ?? "",
    agent.mode ?? "",
    ...agent.fallbacks.flatMap((fallback) => [fallback.model, fallback.variant ?? ""]),
  ].join(" ").toLowerCase();
}

export function compactAgentLine(
  agent: AgentEntry,
  showProvider: boolean,
  selected: boolean,
  symbols: SymbolMode,
  modelDisplay: ModelDisplay,
  config: SidebarConfig,
): string {
  return formatAgentLine(agent, { selected, symbols, width: config.sidebar_width, modelDisplay, showProvider, config });
}

export function initialSectionCollapsed(config: OmoConfig): boolean {
  return config.tui?.default_agents_collapsed ?? false;
}

export function formatFullModelRef(model: string | undefined, variant?: string, options?: { showVariant?: boolean }): string {
  if (!model) return "—";
  if (options?.showVariant && variant) return `${model} · ${variant}`;
  return model;
}
