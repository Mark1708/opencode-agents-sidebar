import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const declarationRoots = ["dist/index.d.ts", "dist/tui.d.ts"];
const closure = new Set();
const pending = [...declarationRoots];

while (pending.length > 0) {
  const declaration = pending.pop();
  if (!declaration || closure.has(declaration)) continue;
  if (!existsSync(join(projectRoot, declaration))) {
    throw new Error(`Missing declaration entrypoint: ${declaration}`);
  }
  closure.add(declaration);
  const source = readFileSync(join(projectRoot, declaration), "utf8");
  for (const match of source.matchAll(/["'](\.{1,2}\/[^"']+)["']/g)) {
    const unresolved = posix.normalize(posix.join(posix.dirname(declaration), match[1]));
    const candidates = match[1].endsWith(".js")
      ? [`${unresolved.slice(0, -3)}.d.ts`]
      : [unresolved, `${unresolved}.d.ts`, posix.join(unresolved, "index.d.ts")];
    const target = candidates.find((candidate) => existsSync(join(projectRoot, candidate)));
    if (target && !closure.has(target)) pending.push(target);
  }
}

function declarationsUnder(directory) {
  return readdirSync(join(projectRoot, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = posix.join(directory, entry.name);
    return entry.isDirectory()
      ? declarationsUnder(path)
      : path.endsWith(".d.ts")
        ? [path]
        : [];
  });
}

for (const declaration of declarationsUnder("dist")) {
  if (closure.has(declaration)) continue;
  rmSync(join(projectRoot, declaration));
  rmSync(join(projectRoot, `${declaration}.map`), { force: true });
}
