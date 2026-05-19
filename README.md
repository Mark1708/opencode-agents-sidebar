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
git clone https://github.com/oh-my-openagent/agents-sidebar.git plugins/agents-sidebar
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
    "poll_interval_ms": 2000
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
    ],
    "default_collapsed": ["Other", "Disabled"],
    "agent_categories": {
      "custom-agent": "Custom Category"
    }
  }
}
```

### Alias Options

```json
{
  "tui": {
    "provider_aliases": {
      "openai": "OA",
      "anthropic": "ANT"
    },
    "model_aliases": {
      "gpt-4": "G4",
      "claude-3": "C3",
      "glm-4.5": "G45"
    },
    "variant_aliases": {
      "fast": "f",
      "turbo": "t",
      "standard": "s"
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
    "model_display": "details-only",
    "show_provider": true,
    "show_variant_in_details": false,
    "show_disabled": "dimmed",
    "agent_row_mode": "compact",
    "symbols": "unicode",
    "category_order": ["Orchestration", "Research", "Architecture", "Review", "Engineering", "Operations", "Analytics", "Consulting", "Other"],
    "default_collapsed": ["Other"],
    "provider_aliases": {
      "openai": "OA",
      "anthropic": "ANT"
    },
    "model_aliases": {
      "gpt-4": "G4",
      "claude-3": "C3"
    },
    "variant_aliases": {
      "fast": "f"
    }
  }
}
```

## Development

### Setup Development Environment

```bash
git clone https://github.com/oh-my-openagent/agents-sidebar.git
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

# Build index module
bun run build:index

# Emit TypeScript declarations
bun run build:types

# Build declarations, index module, and TUI component
bun run build:all

# Type check without emitting
bun run typecheck
```

### Project Structure

```text
agents-sidebar/
├── src/              # TUI rendering, config, formatting, and agent helpers
├── index.ts          # Main plugin entry point
├── tui.ts            # Source barrel for tests and local development
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

- **Orchestration**: Sisyphus, Hephaestus, Prometheus, Atlas, etc.
- **Research**: Oracle, Librarian, Explore, Metis, etc.
- **Architecture**: Planner, Architect, Code Architect, etc.
- **Review**: Code Reviewers, Security Auditors, etc.
- **Engineering**: Backend Dev, Test Writer, Docs Writer, etc.
- **Operations**: Build Error Resolver, E2E Runner, etc.
- **Analytics**: Data Analyst, Vision Processor, etc.
- **Consulting**: Health Consultant, etc.
- **Other**: Unmapped agents

### Display Modes

#### Compact Mode

```text
> sisyphus     OA G4 +2
> oracle       ANT C3
> planner      OA G45
```

#### Split Mode

```text
> sisyphus     OA
               G4 · fast +2
> oracle       ANT
               C3 · standard
```

#### Details-Only Mode

```text
> sisyphus
> oracle
> planner
```

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

- [Documentation](https://github.com/oh-my-openagent/agents-sidebar#readme)
- [Issue Tracker](https://github.com/oh-my-openagent/agents-sidebar/issues)
- [Discussions](https://github.com/oh-my-openagent/agents-sidebar/discussions)

## Acknowledgments

- Built with [OpenCode](https://opencode.ai/) and [OhMyOpenAgent](https://github.com/oh-my-openagent)
- Uses [SolidJS](https://www.solidjs.com/) for UI components
- Supports Unicode and ASCII terminal symbols
