# Contributing to opencode-agents-sidebar

Thank you for your interest in contributing. This document covers the development setup, code style, and pull request process.

## Prerequisites

- **Bun** (latest stable) -- <https://bun.sh>
- **TypeScript** >= 5.5 (installed via `bun install`)

## Development Setup

```bash
git clone https://github.com/Mark1708/opencode-agents-sidebar.git
cd agents-sidebar
bun install
bun run build:all
bun test
bun run typecheck
```

## Build Commands

| Command | Description |
|---|---|
| `bun run typecheck` | Type-check without emitting (`tsc --noEmit`) |
| `bun run build` | Build TUI component (`dist/tui.js`) |
| `bun run build:index` | Build plugin API stub (`dist/index.js`) |
| `bun run build:types` | Emit declaration files (`.d.ts`) |
| `bun run build:all` | Clean + types + index + TUI (full rebuild) |
| `bun test` | Run tests with Bun test runner |

## Code Style

- **No `as any`** -- use `unknown` with type narrowing instead.
- **No `@ts-ignore` or `@ts-expect-error`** -- fix the underlying type issue.
- **File naming**: `kebab-case` for all source files.
- **Immutability**: create new objects with spread syntax; never mutate existing objects.
- **`@opentui/solid` imports**: only in `render.ts`. Never import it from utility modules.
- **Interactive elements**: use `box()` with `onMouseDown`, never `text()`.
- **All TUI strings**: single-line, preformatted, truncate-safe.
- **Functions**: under 50 lines. **Files**: under 800 lines.

## Pull Request Process

1. Fork the repository and create a branch from `main`.
2. Run `bun run build:all && bun run typecheck && bun test` before pushing.
3. Write clear, descriptive commit messages (lowercase, imperative mood).
4. Open a pull request against `main` with a description of the change.
5. All CI checks must pass before merge.

## Language

Use English for all code comments, commit messages, issue descriptions, and pull request discussions.

## Project Context

This is an OpenCode TUI sidebar plugin built with `@opentui/solid` and `@opencode-ai/plugin`. It displays agent lifecycle categories, collapsible sections, and model information from the [OhMyOpenAgent](https://github.com/oh-my-openagent) ecosystem. The plugin reads configuration from `~/.config/opencode/oh-my-openagent.json`.
