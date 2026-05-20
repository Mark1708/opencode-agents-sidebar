# agents-sidebar

[![Bun Version](https://img.shields.io/badge/dynamic/json?url=https://api.bun.sh/versions/latest&query=data.stable&label=bun)](https://bun.sh/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![OpenCode](https://img.shields.io/badge/Powered%20by-OpenCode-black.svg)](https://opencode.ai/)

OpenCode TUI sidebar plugin that displays all configured OhMyOpenAgent agents with lifecycle-based categories, collapsible sections, and model information.

## Features

- **Agent Management**: Displays all OmO agents grouped by lifecycle categories (Orchestration, Research, Architecture, Review, Engineering, Operations, Analytics, Consulting)
- **Collapsible Sections**: Click on category headers to expand/collapse individual sections
- **Bulk Actions**: Click on main header to collapse/expand entire sidebar
- **Detailed View**: Click on any agent to see full model name, variant, and fallback model information
- **Configurable Display**: Choose between inline, details-only, or hidden model display modes
- **Flexible Layout**: Compact and split row modes for different display preferences
- **Aliases Support**: Configure custom aliases for providers, models, and variants
- **Auto-Reload**: Automatic config reloading with fingerprint-based change detection
- **Symbol Options**: Unicode and ASCII symbol modes for different terminal environments
- **Error Handling**: Graceful error states for missing or invalid configuration files
- **Theme Integration**: Full OpenCode theme integration with accent, muted, and border colors

## Requirements

- **OpenCode** >= v1.14.49
- **Bun** runtime >= 1.1.0
- **OhMyOpenAgent (OmO)** configured

## Installation

### npm package

Install the published plugin package in your OpenCode config directory:

```bash
cd ~/.config/opencode
npm install opencode-agents-sidebar
```

Add the package name to your `opencode.json`:

```json
{
  "plugins": ["opencode-agents-sidebar"]
}
```

### Local plugin

Make sure you have OpenCode installed and working:

```bash
opencode --version
```

Install the plugin from source:

```bash
cd ~/.config/opencode
mkdir -p plugins
git clone https://github.com/Mark1708/opencode-agents-sidebar.git plugins/agents-sidebar
cd plugins/agents-sidebar
bun install
bun run build:all
```

Add the local plugin path to your `opencode.json`:

```json
{
  "plugins": ["./plugins/agents-sidebar"]
}
```

## Configuration

All configuration options are set in the `tui` section of your `oh-my-openagent.json` file.

### Core Options

```json
{
  "tui": {
    "sidebar_width": 34,
    "name_width": 18,
    "title": "OmO Agents",
    "poll_interval_ms": 2000,
    "slot_order": 850
  }
}
```

### Display Options

```json
{
  "tui": {
    "model_display": "inline",
    "show_provider": true,
    "show_variant_in_details": false,
    "show_disabled": "dimmed",
    "agent_row_mode": "compact",
    "symbols": "unicode"
  }
}
```

Supported values:

- `model_display`: `"inline"`, `"details-only"`, or `"hidden"`
- `show_disabled`: `"hidden"`, `"dimmed"`, or `"grouped"`
- `agent_row_mode`: `"compact"` or `"split"`
- `symbols`: `"unicode"` or `"ascii"`

### Organization Options

```json
{
  "tui": {
    "category_order": [
      "Orchestration",
      "Research",
      "Architecture",
      "Review",
      "Engineering",
      "Operations",
      "Analytics",
      "Consulting",
      "Other"
    ]
  }
}
```

### Alias Options

```json
{
  "tui": {
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

## Complete Configuration Example

```json
{
  "tui": {
    "sidebar_width": 34,
    "name_width": 18,
    "title": "OmO Agents",
    "poll_interval_ms": 2000,
    "slot_order": 850,
    "model_display": "details-only",
    "show_provider": true,
    "show_variant_in_details": false,
    "show_disabled": "dimmed",
    "agent_row_mode": "compact",
    "symbols": "unicode",
    "category_order": ["Orchestration", "Research", "Architecture", "Review", "Engineering", "Operations", "Analytics", "Consulting", "Other"]
  }
}
```

## Development

### Setup Development Environment

```bash
git clone https://github.com/Mark1708/opencode-agents-sidebar.git
cd agents-sidebar
bun install
bun run build:all
bun test
bun run typecheck
```

### Build Commands

```bash
# Build TUI component
bun run build

# Build declarations, types, and TUI component
bun run build:all

# Type check without emitting
bun run typecheck
```

### Project Structure

```text
agents-sidebar/
├── src/              # TUI rendering, config, formatting, and agent helpers
│   ├── agents.ts     # Agent categorization and filtering logic
│   ├── config.ts     # Configuration reading and merge logic
│   ├── defaults.ts   # Default values and category mappings
│   ├── format.ts     # Text formatting and display utilities
│   ├── render.ts     # TUI rendering components and plugin entry
│   ├── tui.test.ts   # Component tests
│   ├── tui.ts        # TUI component implementation
│   └── types.ts      # TypeScript type definitions
├── dist/             # Built package output
├── package.json      # Package metadata and scripts
├── tsconfig.json     # TypeScript configuration
├── README.md         # This file
├── LICENSE           # MIT License
├── CONTRIBUTING.md   # Contribution guidelines
└── .gitignore        # Git ignore rules
```

## Usage

### In OpenCode

1. Start OpenCode with the plugin enabled.
2. The sidebar will automatically appear on the right side.
3. Use mouse clicks to expand/collapse category sections, select agents for detailed view, and collapse the entire sidebar from the header.

### Agent Categories

Agents are automatically grouped by lifecycle:

- **Orchestration**: sisyphus, hephaestus, prometheus, atlas, sisyphus-junior
- **Research**: oracle, librarian, explore, metis, momus, multimodal-looker
- **Architecture**: planner, architect, code-architect
- **Review**: code-reviewer, typescript-reviewer, python-reviewer, go-reviewer, rust-reviewer, java-reviewer, kotlin-reviewer, security-auditor, devops-reviewer
- **Engineering**: backend-dev, test-writer, docs-writer
- **Operations**: build-error-resolver, e2e-runner, release-manager, database-specialist
- **Analytics**: data-analyst, vision-processor
- **Consulting**: health-consultant
- **Other**: Unmapped agents

### Display Modes

#### Compact Mode

```text
> sisyphus     oa g5.5mf +2
> oracle       ant c3
> planner      oc 5.5
```

#### Split Mode

```text
> sisyphus     oa
               g5.5mf · fast +2
> oracle       ant
               c3 · standard
```

#### Details-Only Mode

```text
> sisyphus
> oracle
> planner
```

## Screenshots

![All categories collapsed](assets/categories-collapsed.png)

![Categories expanded](assets/categories-expanded.png)

![Agent details](assets/agent-details.png)

## Troubleshooting

### Plugin Not Loading

1. Check `opencode.json` has the correct package name or local plugin path.
2. Verify `bun run build:all` completed successfully for local installations.
3. Check OpenCode console for error messages.

### Agents Not Showing

1. Verify OhMyOpenAgent is configured at `~/.config/opencode/oh-my-openagent.json`.
2. Check that agents are defined in the config.
3. Look for console warnings about invalid configuration.

### Sidebar Width Issues

1. Adjust `sidebar_width` in config.
2. Try smaller values if content is cut off.
3. Note: Exact width detection depends on terminal environment.

## Known Limitations

- **Width Detection**: Sidebar width detection is best-effort because no runtime API is available.
- **Polling**: Config reload uses polling instead of file watch in unsupported environments.
- **Styling**: Styling options are limited without a complete OpenCode theme API.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution instructions.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- [Documentation](https://github.com/Mark1708/opencode-agents-sidebar#readme)
- [Issue Tracker](https://github.com/Mark1708/opencode-agents-sidebar/issues)

## Acknowledgments

- Built with [OpenCode](https://opencode.ai/) and [OhMyOpenAgent](https://github.com/oh-my-openagent)
- Uses [SolidJS](https://www.solidjs.com/) for UI components
- Supports Unicode and ASCII terminal symbols