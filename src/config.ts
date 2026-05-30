import { homedir } from "node:os";
import { DEFAULTS } from "./defaults.js";
import type { AliasMap, ConfigState, SidebarConfig } from "./types.js";

export const CONFIG_PATH = `${homedir()}/.config/opencode/oh-my-openagent.json`;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

export function stringArrayValue(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return fallback;
  return [...value];
}

export function mergeAliases(defaults: AliasMap, aliases: unknown): AliasMap {
  if (!isRecord(aliases)) return { ...defaults };
  const safeAliases = Object.fromEntries(
    Object.entries(aliases).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  return { ...defaults, ...safeAliases };
}

export function mergeConfig(userConfig: unknown): SidebarConfig {
  const config = isRecord(userConfig) ? userConfig : {};
  return {
    sidebar_width: numberValue(config.sidebar_width, DEFAULTS.sidebar_width),
    name_width: numberValue(config.name_width, DEFAULTS.name_width),
    poll_interval_ms: numberValue(config.poll_interval_ms, DEFAULTS.poll_interval_ms),
    slot_order: numberValue(config.slot_order, DEFAULTS.slot_order),
    title: stringValue(config.title, DEFAULTS.title),
    category_order: stringArrayValue(config.category_order, DEFAULTS.category_order),
    model_display: enumValue(config.model_display, ["inline", "details-only", "hidden"], DEFAULTS.model_display),
    show_provider: booleanValue(config.show_provider, DEFAULTS.show_provider),
    show_variant_in_details: booleanValue(config.show_variant_in_details, DEFAULTS.show_variant_in_details),
    show_disabled: enumValue(config.show_disabled, ["hidden", "dimmed", "grouped"], DEFAULTS.show_disabled),
    agent_row_mode: enumValue(config.agent_row_mode, ["compact", "split"], DEFAULTS.agent_row_mode),
    symbols: enumValue(config.symbols, ["unicode", "ascii"], DEFAULTS.symbols),
    provider_aliases: mergeAliases(DEFAULTS.provider_aliases, config.provider_aliases),
    model_aliases: mergeAliases(DEFAULTS.model_aliases, config.model_aliases),
    variant_aliases: mergeAliases(DEFAULTS.variant_aliases, config.variant_aliases),
  };
}

export function configFingerprint(state: ConfigState): string {
  if (state.kind !== "loaded") {
    return state.kind === "invalid" ? `${state.kind}:${state.path}:${state.error}` : `${state.kind}:${state.path}`;
  }
  const config = state.config;
  return JSON.stringify({
    agents: config.agents ?? {},
    agent_order: config.agent_order ?? [],
    disabled_agents: config.disabled_agents ?? [],
    tui: config.tui ?? {},
    team_mode: config.team_mode ?? {},
    tmux: config.tmux ?? {},
  });
}

export async function readConfigAsync(path: string = CONFIG_PATH): Promise<ConfigState> {
  const file = Bun.file(path);
  try {
    if (!(await file.exists())) return { kind: "missing", path };
    return parseConfigText(await file.text(), path);
  } catch (_ioError: unknown) {
    return { kind: "missing", path };
  }
}

function parseConfigText(raw: string, path: string): ConfigState {
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return { kind: "invalid", path, error: "Config must be a JSON object" };
    return { kind: "loaded", config: parsed, path };
  } catch (parseError: unknown) {
    return { kind: "invalid", path, error: shortError(parseError) };
  }
}

export function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n")[0] ?? "Invalid JSON";
}

export function sanitizeLine(value: string): string {
  return [...value].map((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : char;
  }).join("");
}
