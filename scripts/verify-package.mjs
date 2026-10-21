import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
const expectedIds = {
  "opencode-usage-monitor": ["usage-monitor", "usage-monitor.tui"],
  "opencode-agents-sidebar": ["agents-sidebar", "agents-sidebar.tui"],
};
const ids = expectedIds[packageJson.name];
if (!ids) throw new Error(`Unsupported package verifier target: ${packageJson.name}`);

const artifactsDir = join(projectRoot, ".artifacts");
const fixedTarball = join(artifactsDir, "package.tgz");
rmSync(artifactsDir, { recursive: true, force: true });
mkdirSync(artifactsDir, { recursive: true });

const packOutput = execFileSync("npm", ["pack", "--json", "--pack-destination", artifactsDir], {
  cwd: projectRoot,
  encoding: "utf8",
});
const packResult = JSON.parse(packOutput);
const tarballs = readdirSync(artifactsDir).filter((name) => name.endsWith(".tgz"));
if (!Array.isArray(packResult) || packResult.length !== 1 || tarballs.length !== 1) {
  throw new Error(`Expected exactly one packed tarball, got ${tarballs.length}`);
}
renameSync(join(artifactsDir, tarballs[0]), fixedTarball);

const archiveEntries = execFileSync("tar", ["-tzf", fixedTarball], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const entrySet = new Set(archiveEntries);
for (const required of [
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/tui.js",
  "package/dist/tui.d.ts",
]) {
  if (!entrySet.has(required)) throw new Error(`Package is missing ${required}`);
}

const forbidden = archiveEntries.filter((entry) =>
  entry.startsWith("package/src/") ||
  entry.startsWith("package/dist/src/") ||
  entry.includes("/__tests__/") ||
  /\.test\.d\.ts$/.test(entry) ||
  /^package\/(?:index|tui)\.(?:js|ts|d\.ts)$/.test(entry) ||
  entry.endsWith(".tgz") ||
  /(?:^|\/)\.npmrc$/.test(entry) ||
  /(?:^|\/)\.env(?:\.|$)/.test(entry)
);
if (forbidden.length > 0) throw new Error(`Forbidden package entries:\n${forbidden.join("\n")}`);

function declarationTarget(fromFile, specifier) {
  const unresolved = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  const candidates = specifier.endsWith(".js")
    ? [`${unresolved.slice(0, -3)}.d.ts`]
    : specifier.endsWith(".d.ts")
      ? [unresolved]
      : [unresolved, `${unresolved}.d.ts`, posix.join(unresolved, "index.d.ts")];
  return candidates.find((candidate) => existsSync(join(projectRoot, candidate)));
}

const declarationClosure = new Set();
const pendingDeclarations = ["dist/index.d.ts", "dist/tui.d.ts"];
while (pendingDeclarations.length > 0) {
  const declaration = pendingDeclarations.pop();
  if (!declaration || declarationClosure.has(declaration)) continue;
  declarationClosure.add(declaration);
  const source = readFileSync(join(projectRoot, declaration), "utf8");
  for (const match of source.matchAll(/["'](\.{1,2}\/[^"']+)["']/g)) {
    const target = declarationTarget(declaration, match[1]);
    if (target && !declarationClosure.has(target)) pendingDeclarations.push(target);
  }
}
const unexpectedDeclarations = archiveEntries
  .filter((entry) => entry.endsWith(".d.ts"))
  .map((entry) => entry.slice("package/".length))
  .filter((entry) => !declarationClosure.has(entry));
if (unexpectedDeclarations.length > 0) {
  throw new Error(`Declarations outside exported closure:\n${unexpectedDeclarations.join("\n")}`);
}

const consumerDir = mkdtempSync(join(tmpdir(), `${packageJson.name}-consumer-`));
try {
  const packageSpecifier = packageJson.name;
  writeFileSync(join(consumerDir, "package.json"), JSON.stringify({
    private: true,
    type: "module",
    dependencies: {
      [packageSpecifier]: pathToFileURL(fixedTarball).href,
      "@opencode/theme": "2.0.32",
      "@opentui/core": "0.5.17",
      "@opentui/solid": "0.5.17",
      "solid-js": "1.9.12",
    },
    devDependencies: {
      "@types/json-schema": "7.0.15",
      "@types/node": "24.12.0",
      typescript: "5.9.3",
    },
    overrides: {
      "@aws-sdk/client-cognito-identity": "3.1057.0",
      "@aws-sdk/core": "3.978.3",
      "@aws-sdk/credential-provider-cognito-identity": "3.972.73",
      "@aws-sdk/credential-provider-env": "3.972.74",
      "@aws-sdk/credential-provider-http": "3.972.76",
      "@aws-sdk/credential-provider-ini": "3.973.19",
      "@aws-sdk/credential-provider-login": "3.972.81",
      "@aws-sdk/credential-provider-node": "3.972.86",
      "@aws-sdk/credential-provider-process": "3.972.74",
      "@aws-sdk/credential-provider-sso": "3.973.18",
      "@aws-sdk/credential-provider-web-identity": "3.972.80",
      "@aws-sdk/credential-providers": "3.1057.0",
      "@aws-sdk/nested-clients": "3.997.48",
      "@aws-sdk/signature-v4-multi-region": "3.996.48",
      "@aws-sdk/token-providers": "3.1150.0",
      "@aws-sdk/types": "3.974.6",
      "@aws-sdk/util-locate-window": "3.965.10",
      "@aws-sdk/xml-builder": "3.972.41",
    },
  }, null, 2));
  writeFileSync(join(consumerDir, "import-check.mjs"), `
import server from ${JSON.stringify(packageSpecifier)};
import tui from ${JSON.stringify(`${packageSpecifier}/tui`)};
for (const [module, expectedId] of [[server, ${JSON.stringify(ids[0])}], [tui, ${JSON.stringify(ids[1])}]]) {
  if (module.id !== expectedId || typeof module.setup !== "function") throw new Error("Invalid V2 plugin export");
  if (Object.hasOwn(module, "server") || Object.hasOwn(module, "tui")) throw new Error("V1 plugin field leaked");
}
`);
  writeFileSync(join(consumerDir, "consumer.ts"), `
import server from ${JSON.stringify(packageSpecifier)};
import tui from ${JSON.stringify(`${packageSpecifier}/tui`)};
const serverId: string = server.id;
const tuiId: string = tui.id;
const serverSetup: Function = server.setup;
const tuiSetup: Function = tui.setup;
void [serverId, tuiId, serverSetup, tuiSetup];
`);
  writeFileSync(join(consumerDir, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "Bundler",
      lib: ["ESNext", "DOM"],
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      types: ["node"],
    },
    files: ["consumer.ts"],
  }, null, 2));
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: consumerDir, stdio: "inherit" });
  execFileSync("bun", ["run", "import-check.mjs"], { cwd: consumerDir, stdio: "inherit" });
  execFileSync(join(consumerDir, "node_modules", ".bin", "tsc"), ["--project", "tsconfig.json"], { cwd: consumerDir, stdio: "inherit" });
} finally {
  rmSync(consumerDir, { recursive: true, force: true });
}

console.log(`${packageJson.name}@${packageJson.version}: package contract verified`);
