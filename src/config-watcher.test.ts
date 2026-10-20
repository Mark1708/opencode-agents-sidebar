import { describe, expect, test } from "bun:test";
import {
  createConfigWatcher,
  type ConfigWatchDependencies,
  type DirectoryWatcher,
} from "./config-watcher.js";

async function settle(): Promise<void> {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
}

type FakeWatch = DirectoryWatcher & {
  directory: string;
  emit(filename: string | null): void;
  fail(): void;
  closed: number;
};

function fakeDependencies(): {
  dependencies: ConfigWatchDependencies;
  watches: FakeWatch[];
  polls: Array<() => void>;
  cleared: unknown[];
  setWatchFailure(value: boolean): void;
} {
  const watches: FakeWatch[] = [];
  const polls: Array<() => void> = [];
  const cleared: unknown[] = [];
  let watchFailure = false;
  const dependencies: ConfigWatchDependencies = {
    watchDirectory: (directory, listener) => {
      if (watchFailure) throw new Error("watch failed");
      let errorListener = (): void => undefined;
      const watcher: FakeWatch = {
        directory,
        closed: 0,
        close() { this.closed += 1; },
        onError(callback) { errorListener = callback; },
        emit: listener,
        fail: () => errorListener(),
      };
      watches.push(watcher);
      return watcher;
    },
    setInterval: (callback) => {
      polls.push(callback);
      return { poll: polls.length };
    },
    clearInterval: (handle) => { cleared.push(handle); },
  };
  return {
    dependencies,
    watches,
    polls,
    cleared,
    setWatchFailure: (value) => { watchFailure = value; },
  };
}

describe("directory config watcher", () => {
  test("deduplicates directories and filters unrelated filenames while accepting null", async () => {
    const fake = fakeDependencies();
    let reloads = 0;
    const watcher = createConfigWatcher(async () => { reloads += 1; }, fake.dependencies);
    watcher.update(["/tmp/config/a.json", "/tmp/config/b.json", "/tmp/config/a.json"], 2000);

    expect(fake.watches.map((entry) => entry.directory)).toEqual(["/tmp/config"]);
    fake.watches[0]?.emit("unrelated.json");
    fake.watches[0]?.emit("a.json");
    fake.watches[0]?.emit(null);
    await settle();

    expect(reloads).toBe(2);
  });

  test("keeps polling after rejected reload and restores native watches after success", async () => {
    const fake = fakeDependencies();
    fake.setWatchFailure(true);
    let rejectReload = true;
    let reloads = 0;
    const watcher = createConfigWatcher(async () => {
      reloads += 1;
      if (rejectReload) throw new Error("still unavailable");
    }, fake.dependencies);
    watcher.update(["/tmp/config.json"], 5000);

    expect(fake.polls).toHaveLength(1);
    fake.polls[0]?.();
    await settle();
    expect(reloads).toBe(1);
    expect(fake.cleared).toHaveLength(0);

    rejectReload = false;
    fake.setWatchFailure(false);
    fake.polls[0]?.();
    await settle();
    expect(reloads).toBe(2);
    expect(fake.watches.map((entry) => entry.directory)).toEqual(["/tmp"]);
    expect(fake.cleared).toHaveLength(1);
  });

  test("reconfigures path and interval, recovers from native errors, and disposes idempotently", async () => {
    const fake = fakeDependencies();
    const watcher = createConfigWatcher(async () => undefined, fake.dependencies);
    watcher.update(["/tmp/a.json"], 2000);
    watcher.update(["/var/config/b.json"], 9000);

    expect(fake.watches[0]?.closed).toBe(1);
    expect(fake.watches[1]?.directory).toBe("/var/config");
    fake.setWatchFailure(true);
    fake.watches[1]?.fail();
    await settle();
    expect(fake.watches[1]?.closed).toBe(1);
    expect(fake.polls).toHaveLength(1);

    watcher.dispose();
    watcher.dispose();
    watcher.update(["/ignored.json"], 1000);
    expect(fake.cleared).toHaveLength(1);
    expect(fake.watches).toHaveLength(2);
  });

  test("observes replacement rename and the following in-place change", async () => {
    const fake = fakeDependencies();
    let reloads = 0;
    const watcher = createConfigWatcher(async () => { reloads += 1; }, fake.dependencies);
    watcher.update(["/tmp/config.json"], 2000);

    fake.watches[0]?.emit("config.json");
    fake.watches[0]?.emit("config.json");
    await settle();

    expect(reloads).toBe(2);
  });
});
