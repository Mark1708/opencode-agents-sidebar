# opencode-agents-sidebar

[Русская версия](./README.ru.md)

> OpenCode TUI sidebar plugin for browsing configured OhMyOpenAgent agents by lifecycle category, model, provider, and status.

[![Package](https://img.shields.io/badge/npm-opencode--agents--sidebar-111827?style=for-the-badge&labelColor=111827&color=5b5ef4)](https://www.npmjs.com/package/opencode-agents-sidebar)
![Runtime](https://img.shields.io/badge/runtime-Bun-111827?style=for-the-badge&logo=bun&logoColor=5b5ef4)
![Host](https://img.shields.io/badge/host-OpenCode-111827?style=for-the-badge&labelColor=111827&color=5b5ef4)
![License](https://img.shields.io/badge/license-MIT-111827?style=for-the-badge&labelColor=111827&color=5b5ef4)

| Field | Value |
|---|---|
| Status | Actively maintained personal OpenCode tool/plugin |
| Type | OpenCode TUI plugin / host extension |
| Host app | OpenCode `>= v1.14.49` documented; `@opencode-ai/plugin >=1.4.0` peer dependency |
| Package | `opencode-agents-sidebar` `1.0.7`, published on npm |
| Runtime | Bun `>=1.1.0` |
| Maintainer checks | `bun install && bun run build:all && bun test && bun run typecheck` |

## Screenshots

The plugin renders agent categories and details inside the OpenCode terminal UI sidebar.

![All categories collapsed](assets/categories-collapsed.png)

![Categories expanded](assets/categories-expanded.png)

![Agent details](assets/agent-details.png)

## Summary

- Displays configured OhMyOpenAgent agents in the OpenCode sidebar.
- Groups agents by lifecycle categories such as orchestration, research, architecture, review, engineering, operations, analytics, and consulting.
- Supports collapsible category sections and a collapsible main sidebar panel.
- Shows provider, model, variant, fallback, and disabled-agent information according to display settings.
- Supports compact and split row layouts for different terminal widths.
- Supports provider, model, and variant aliases for shorter terminal output.
- Reloads OhMyOpenAgent configuration by polling and fingerprint comparison.
- Handles missing or invalid configuration files with explicit sidebar states.

## Quick start

```sh
# install the published OpenCode plugin globally
opencode plugin opencode-agents-sidebar@latest --global --force

# optional: build from a local checkout for development
git clone https://github.com/Mark1708/opencode-agents-sidebar.git
cd opencode-agents-sidebar
bun install
bun run build:all
```

The plugin reads shared OhMyOpenAgent data and sidebar display settings from `~/.config/opencode/oh-my-openagent.json`.

## Installation

### OpenCode plugin install

```sh
opencode plugin opencode-agents-sidebar@latest --global --force
```

This is the recommended path for users because the plugin is published on npm and OpenCode can install it directly.

### Local checkout for development

```sh
git clone https://github.com/Mark1708/opencode-agents-sidebar.git
cd opencode-agents-sidebar
bun install
bun run build:all
```

The build emits the plugin entry and TUI bundle into `dist/`.

## Compatibility

| Component | Supported version | Source |
|---|---|---|
| Host app | OpenCode `>= v1.14.49` | README compatibility note |
| Plugin API | `@opencode-ai/plugin >=1.4.0` | `package.json` peer dependency |
| TUI runtime | `@opentui/solid >=0.1.0`, `solid-js >=1.8.0` | `package.json` peer dependencies |
| Local runtime | Bun `>=1.1.0` | `package.json` engines and Bun-based scripts |
| TypeScript | `^5.5.0` | `package.json` dev dependency |

## Configuration

The sidebar reads the shared OhMyOpenAgent configuration file:

```text
~/.config/opencode/oh-my-openagent.json
```

That file is owned by the oh-my-opencode / oh-my-openagent ecosystem. Sidebar-specific display options belong only in the `tui` section.

Top-level sections such as `agents`, `agent_order`, `disabled_agents`, `team_mode`, and `tmux` are shared OhMyOpenAgent data. The sidebar renders that data when present, but those sections are not separate sidebar plugin configuration.

Smallest useful configuration:

```json
{
  "tui": {
    "sidebar_width": 34,
    "name_width": 18,
    "title": "OmO Agents"
  }
}
```

Full documented shape:

```json
{
  "tui": {
    "sidebar_width": 34,
    "name_width": 18,
    "poll_interval_ms": 2000,
    "slot_order": 850,
    "title": "OmO Agents",
    "category_order": ["Orchestration", "Research", "Architecture", "Review", "Engineering", "Operations", "Analytics", "Consulting", "Other"],
    "model_display": "details-only",
    "show_provider": true,
    "show_variant_in_details": false,
    "show_disabled": "dimmed",
    "agent_row_mode": "compact",
    "symbols": "unicode",
    "provider_aliases": {
      "openai": "oa",
      "opencode": "oc",
      "zai-coding-plan": "zai"
    },
    "model_aliases": {
      "gpt-5.4-mini-fast": "gpt-5.4mf",
      "gpt-5.4-mini": "gpt-5.4m",
      "gpt-5.5": "5.5",
      "glm-4.5-air": "glm-4.5a"
    },
    "variant_aliases": {
      "medium": "M",
      "high": "H",
      "xhigh": "XH"
    }
  }
}
```

Supported values:

- `model_display`: `"inline"`, `"details-only"`, or `"hidden"`.
- `show_disabled`: `"hidden"`, `"dimmed"`, or `"grouped"`.
- `agent_row_mode`: `"compact"` or `"split"`.
- `symbols`: `"unicode"` or `"ascii"`.

## Usage

- Start OpenCode with the plugin installed.
- The sidebar appears on the right side of the TUI.
- Click the main header to collapse or expand the full sidebar.
- Click category headers to collapse or expand lifecycle groups.
- Click an agent row to show model, variant, and fallback details.
- Tune width, model display, aliases, and symbol mode in `oh-my-openagent.json`.

## Agent categories

Default lifecycle grouping comes from `src/defaults.ts`:

| Category | Examples |
|---|---|
| Orchestration | `sisyphus`, `hephaestus`, `prometheus`, `atlas`, `sisyphus-junior` |
| Research | `oracle`, `librarian`, `explore`, `metis`, `momus`, `multimodal-looker` |
| Architecture | `planner`, `architect`, `code-architect` |
| Review | `code-reviewer`, `typescript-reviewer`, `python-reviewer`, `go-reviewer`, `rust-reviewer`, `java-reviewer`, `kotlin-reviewer`, `security-auditor`, `devops-reviewer` |
| Engineering | `backend-dev`, `test-writer`, `docs-writer` |
| Operations | `build-error-resolver`, `e2e-runner`, `release-manager`, `database-specialist` |
| Analytics | `data-analyst`, `vision-processor` |
| Consulting | `health-consultant` |
| Other | Agents not mapped to a known category |

## Display options

By default, the sidebar uses `agent_row_mode: "compact"` with `model_display: "details-only"`. That means the agent list stays focused on names, while the selected agent shows model details below the row.

The runtime display includes the main header, optional team status line, expanded or collapsed categories, details-only agent rows, and selected agent details:

```text
▼ OmO Agents (33 active)
team 2/4
▼ Orchestration (5)
› sisyphus
    mode primary
    1°   zai-coding-plan/glm-5.1
    fb   openai/gpt-5.5
    fb   opencode/big-pickle
  hephaestus
  prometheus
  atlas
▶ Architecture (3)
```

- `agent_row_mode`: `"compact"` keeps each agent on one row. `"split"` uses two rows when `model_display` is `"inline"`.
- `model_display`: `"details-only"` shows provider and model details only for the selected agent. `"inline"` shows model information in the agent row. `"hidden"` hides model information from rows and details.

## Project structure

```text
.
├── assets/                    # Local screenshots used by this README
├── dist/                      # Built package output
├── src/
│   ├── agents.ts              # Agent categorization and filtering logic
│   ├── config.ts              # oh-my-openagent.json reading and merge logic
│   ├── defaults.ts            # Default values and category mappings
│   ├── format.ts              # Text formatting and display utilities
│   ├── index.ts               # OpenCode plugin entry
│   ├── render.ts              # TUI plugin render entry
│   ├── tui.ts                 # TUI component implementation
│   └── types.ts               # TypeScript type definitions
├── package.json               # Package metadata, scripts, peer dependencies
├── tsconfig.json              # TypeScript configuration
└── LICENSE
```

## Troubleshooting

- If the plugin does not load, run `opencode plugin opencode-agents-sidebar@latest --global --force` again and restart OpenCode.
- If agents do not appear, verify `~/.config/opencode/oh-my-openagent.json` exists and contains configured agents.
- If the config is invalid, the sidebar shows an explicit invalid-configuration state.
- If content is cut off, adjust `sidebar_width`, `name_width`, or `agent_row_mode`.
- If model names are too long, use `model_aliases`, `provider_aliases`, or `variant_aliases`.
- If config changes do not appear immediately, wait for the polling interval or restart OpenCode.

## Limitations / Security

- The plugin reads local OhMyOpenAgent configuration metadata, not provider credentials.
- Config reload uses polling and fingerprint comparison instead of a file watcher.
- Sidebar width behavior is constrained by terminal and OpenCode TUI rendering.
- Styling depends on the host OpenCode and OpenTUI theme capabilities.
- Example configuration values are placeholders and can be adjusted per local setup.

## Status

Actively maintained personal OpenCode tool/plugin. Public issues and improvements are welcome, but the project is primarily maintained around the author's own workflow.

## Links / License

- Package: <https://www.npmjs.com/package/opencode-agents-sidebar>
- Repository: <https://github.com/Mark1708/opencode-agents-sidebar>
- Host app: <https://opencode.ai/>
- License: MIT, see [`LICENSE`](LICENSE)
