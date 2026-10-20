# AGENTS SIDEBAR PLUGIN

**Version:** 2.0.0 | **npm:** `opencode-agents-sidebar` | **Plugin IDs:** `agents-sidebar`, `agents-sidebar.tui`

## OVERVIEW

OpenCode V2-only sidebar for OhMyOpenAgent lifecycle categories, collapsible groups, selection, model details, and config diagnostics. Current discovery reads only `oh-my-openagent.json`; the provider seam permits a future native OpenCode source but does not imply universal discovery.

## STRUCTURE

```text
src/
├── index.ts          # V2 server entry (`@opencode/plugin`)
├── tui.ts            # V2 setup, signals, reload ownership, teardown
├── render.ts         # sole OpenTUI/Solid boundary and tracked mount
├── runtime.ts        # runtime state and serialized reload controller
├── config-watcher.ts # directory watches with polling recovery
├── providers/        # agent provider seam and OMO source
├── agents.ts         # categorization and group construction
├── config.ts         # sidebar config parsing
├── defaults.ts       # immutable defaults
├── format.ts         # single-line render formatting
└── types.ts          # domain and render types
scripts/verify-package.mjs
.github/workflows/
├── ci.yml             # Required PR/push checks and package artifact
└── release.yml        # Tag validation, npm OIDC publish, GitHub Release
```

## CONTRACTS

- Server dependency: `@opencode/plugin@2.0.32`.
- Host/TUI peers: `@opencode/theme`, `@opentui/core`, `@opentui/solid`, and `solid-js`.
- Package exports are `.` and `./tui`; local-directory host smoke uses disposable root wrappers, never repository root shims.
- `@opentui/solid` is imported only in `src/render.ts`.
- A slot callback creates one stable container; `insert(container, () => ...)` owns reactive rendering.
- Runtime state is `loaded | missing | invalid | error`, with deterministic fingerprint and watch specification.
- Reload work is serialized/coalesced and generation-gated. Cleanup invalidates pending work before closing the slot, controller, and watcher.
- User collapse and selection state survives reload after first valid initialization.
- All display output is single-line and truncate-safe.

## COMMANDS

```bash
bun run typecheck
bun test
bun run build:all
bun run verify:package
```

## AUTOMATION

- GitHub is the source of truth. `CI / Typecheck`, `CI / Tests`, and `CI / Package` are required before merge.
- CI uploads the exact `.artifacts/package.tgz` produced by `verify:package`.
- A `vX.Y.Z` tag must equal `package.json.version`; the release workflow repeats every gate, publishes the verified tarball through npm Trusted Publishing/OIDC, and attaches it with its SHA-256 digest to the GitHub Release.
- GitLab is a read-only mirror and has no release pipeline.

## ANTI-PATTERNS

- NEVER add `@opencode-ai/plugin`, `@opencode-ai/sdk`, V1 plugin lifecycle, dual runtime shapes, or root entry shims.
- NEVER import `@opentui/solid` outside `src/render.ts`.
- NEVER mutate defaults or accepted runtime state; create new values.
- NEVER publish an unchanged fingerprint or let an older reload generation commit.
- NEVER use `text()` for interactive elements; use `box()` with `onMouseDown`.
- NEVER restore removed `slot_order`; V2 contribution order follows package order in host config.
