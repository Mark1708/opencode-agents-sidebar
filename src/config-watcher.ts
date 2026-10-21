import { watch } from "node:fs";
import { basename, dirname, resolve } from "node:path";

export interface DirectoryWatcher {
  close(): void;
  onError(callback: () => void): void;
}

export interface ConfigWatchDependencies {
  watchDirectory(directory: string, listener: (filename: string | null) => void): DirectoryWatcher;
  setInterval(callback: () => void, intervalMs: number): unknown;
  clearInterval(handle: unknown): void;
}

export interface ConfigWatcher {
  update(paths: readonly string[], pollIntervalMs: number): void;
  dispose(): void;
}

const DEFAULT_DEPENDENCIES: ConfigWatchDependencies = {
  watchDirectory: (directory, listener) => {
    const nativeWatcher = watch(directory, { persistent: false }, (_event, filename) => {
      listener(filename === null ? null : filename.toString());
    });
    return {
      close: () => nativeWatcher.close(),
      onError: (callback) => { nativeWatcher.on("error", callback); },
    };
  },
  setInterval: (callback, intervalMs) => setInterval(callback, intervalMs),
  clearInterval: (handle) => clearInterval(handle as Parameters<typeof clearInterval>[0]),
};

export function createConfigWatcher(
  reload: () => Promise<void>,
  dependencies: ConfigWatchDependencies = DEFAULT_DEPENDENCIES,
): ConfigWatcher {
  let disposed = false;
  let paths: string[] = [];
  let pollIntervalMs = 2000;
  let nativeWatchers: DirectoryWatcher[] = [];
  let pollHandle: unknown;
  let pollRunning = false;

  const closeNativeWatchers = (): void => {
    for (const watcher of nativeWatchers) watcher.close();
    nativeWatchers = [];
  };
  const stopPolling = (): void => {
    if (pollHandle === undefined) return;
    dependencies.clearInterval(pollHandle);
    pollHandle = undefined;
  };

  const startPolling = (): void => {
    closeNativeWatchers();
    if (disposed || paths.length === 0 || pollHandle !== undefined) return;
    pollHandle = dependencies.setInterval(() => { void poll(); }, pollIntervalMs);
  };

  const openNativeWatchers = (): boolean => {
    if (disposed || paths.length === 0) return true;
    const pathsByDirectory = new Map<string, Set<string>>();
    for (const path of paths) {
      const directory = dirname(path);
      const names = pathsByDirectory.get(directory) ?? new Set<string>();
      names.add(basename(path));
      pathsByDirectory.set(directory, names);
    }

    const opened: DirectoryWatcher[] = [];
    try {
      for (const [directory, names] of pathsByDirectory) {
        const watcher = dependencies.watchDirectory(directory, (filename) => {
          if (disposed || (filename !== null && !names.has(filename))) return;
          void reload().catch(() => undefined);
        });
        watcher.onError(startPolling);
        opened.push(watcher);
      }
    } catch {
      for (const watcher of opened) watcher.close();
      return false;
    }
    nativeWatchers = opened;
    return true;
  };

  const recoverNativeWatchers = (): void => {
    closeNativeWatchers();
    if (!openNativeWatchers()) return;
    stopPolling();
  };

  const poll = async (): Promise<void> => {
    if (disposed || pollRunning) return;
    pollRunning = true;
    try {
      await reload();
      if (!disposed) recoverNativeWatchers();
    } catch {
      // Keep polling until both reload and native watch setup recover.
    } finally {
      pollRunning = false;
    }
  };

  return {
    update(nextPaths, nextPollIntervalMs) {
      if (disposed) return;
      const normalizedPaths = [...new Set(nextPaths.map((path) => resolve(path)))].sort();
      const normalizedInterval = Number.isFinite(nextPollIntervalMs) && nextPollIntervalMs > 0
        ? nextPollIntervalMs
        : 2000;
      if (
        normalizedInterval === pollIntervalMs
        && normalizedPaths.length === paths.length
        && normalizedPaths.every((path, index) => path === paths[index])
      ) return;

      closeNativeWatchers();
      stopPolling();
      paths = normalizedPaths;
      pollIntervalMs = normalizedInterval;
      if (!openNativeWatchers()) startPolling();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      closeNativeWatchers();
      stopPolling();
    },
  };
}
