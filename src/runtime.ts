import { buildSidebarViewState } from "./agents.js";
import { isRecord, mergeConfig, sanitizeLine, shortError } from "./config.js";
import { OMO_CONFIG_PATH } from "./providers/omo.js";
import { loadAgentSources, type LoadedAgentSources } from "./providers/index.js";
import type { AgentSourceState } from "./providers/types.js";
import type { SidebarConfig, SidebarViewState } from "./types.js";

export type WatchSpec = Readonly<{
  paths: readonly string[];
  pollIntervalMs: number;
}>;

type RuntimeBase = Readonly<{
  renderConfig: SidebarConfig;
  fingerprint: string;
  watchSpec: WatchSpec;
}>;

type LoadedViewState = Extract<SidebarViewState, { kind: "loaded" }>;

export type SidebarRuntimeState =
  | (LoadedViewState & RuntimeBase & Readonly<{
      defaultCollapsed: readonly string[];
      defaultSectionCollapsed: boolean;
    }>)
  | (Extract<SidebarViewState, { kind: "missing" }> & RuntimeBase)
  | (Extract<SidebarViewState, { kind: "invalid" }> & RuntimeBase)
  | (Readonly<{ kind: "error"; error: string }> & RuntimeBase);

export type RuntimeLoadOptions = Readonly<{
  loadSources?: () => Promise<LoadedAgentSources>;
  fallbackWatchSpec?: WatchSpec;
}>;

export async function loadSidebarRuntimeState(
  options: RuntimeLoadOptions = {},
): Promise<SidebarRuntimeState> {
  const fallbackWatchSpec = copyWatchSpec(options.fallbackWatchSpec ?? {
    paths: [OMO_CONFIG_PATH],
    pollIntervalMs: 2000,
  });
  try {
    const loaded = await (options.loadSources ?? loadAgentSources)();
    const omoSource = loaded.sources.find((source) => source.source === "oh-my-openagent");
    const renderConfig = configFromSources(loaded.sources);
    const watchSpec = watchSpecFromSources(loaded.sources, renderConfig, fallbackWatchSpec);
    const configState = omoSource?.metadata.configState;
    const path = omoSource?.watchedPaths[0] ?? watchSpec.paths[0] ?? OMO_CONFIG_PATH;

    if (configState === "missing") {
      return fingerprinted({ kind: "missing", path, renderConfig, watchSpec });
    }
    if (configState === "invalid") {
      return fingerprinted({
        kind: "invalid",
        path,
        error: configError(omoSource),
        renderConfig,
        watchSpec,
      });
    }

    const viewState = buildSidebarViewState(loaded.sources, renderConfig);
    return fingerprinted({
      ...viewState,
      renderConfig,
      watchSpec,
      defaultCollapsed: defaultCollapsedFromSources(loaded.sources),
      defaultSectionCollapsed: defaultSectionCollapsedFromSources(loaded.sources),
    });
  } catch (error: unknown) {
    return fingerprinted({
      kind: "error",
      error: sanitizeLine(shortError(error)).slice(0, 160),
      renderConfig: mergeConfig(undefined),
      watchSpec: fallbackWatchSpec,
    });
  }
}

function fingerprinted<T extends object>(state: T): T & Readonly<{ fingerprint: string }> {
  return { ...state, fingerprint: JSON.stringify(state) };
}

function copyWatchSpec(spec: WatchSpec): WatchSpec {
  return { paths: [...spec.paths], pollIntervalMs: spec.pollIntervalMs };
}

function configFromSources(sources: readonly AgentSourceState[]): SidebarConfig {
  const tui = sources.find((source) => isRecord(source.metadata.tui))?.metadata.tui;
  return mergeConfig(tui);
}

function watchSpecFromSources(
  sources: readonly AgentSourceState[],
  config: SidebarConfig,
  fallback: WatchSpec,
): WatchSpec {
  const watchedPaths = [...new Set(sources.flatMap((source) => source.watchedPaths))].sort();
  return {
    paths: watchedPaths.length > 0 ? watchedPaths : [...fallback.paths],
    pollIntervalMs: config.poll_interval_ms,
  };
}

function defaultCollapsedFromSources(sources: readonly AgentSourceState[]): readonly string[] {
  const tui = sources.find((source) => isRecord(source.metadata.tui))?.metadata.tui;
  if (!isRecord(tui) || !Array.isArray(tui.default_collapsed)) return [];
  return tui.default_collapsed.every((item) => typeof item === "string")
    ? [...tui.default_collapsed]
    : [];
}

function defaultSectionCollapsedFromSources(sources: readonly AgentSourceState[]): boolean {
  const tui = sources.find((source) => isRecord(source.metadata.tui))?.metadata.tui;
  return isRecord(tui) && typeof tui.default_agents_collapsed === "boolean"
    ? tui.default_agents_collapsed
    : false;
}

function configError(source: AgentSourceState | undefined): string {
  const metadataError = source?.metadata.configError;
  if (typeof metadataError === "string") return metadataError;
  return source?.errors[0]?.message ?? "Invalid OhMyOpenAgent configuration";
}

export type ReloadController = Readonly<{
  request(): Promise<void>;
  dispose(): void;
}>;

export type ReloadControllerOptions = Readonly<{
  initialState: SidebarRuntimeState;
  load(fallbackWatchSpec: WatchSpec): Promise<SidebarRuntimeState>;
  accept(state: SidebarRuntimeState): void;
}>;

export function createReloadController(options: ReloadControllerOptions): ReloadController {
  let disposed = false;
  let generation = 0;
  let queued = false;
  let active: Promise<void> | undefined;
  let current = options.initialState;

  const drain = async (): Promise<void> => {
    while (queued && !disposed) {
      queued = false;
      const requestGeneration = generation;
      let next: SidebarRuntimeState;
      try {
        next = await options.load(current.watchSpec);
      } catch {
        continue;
      }
      if (disposed || requestGeneration !== generation) continue;
      if (next.fingerprint === current.fingerprint) continue;
      current = next;
      options.accept(next);
    }
  };

  return {
    request() {
      if (disposed) return Promise.resolve();
      generation += 1;
      queued = true;
      if (!active) {
        active = drain().finally(() => { active = undefined; });
      }
      return active;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      queued = false;
    },
  };
}
