# opencode-agents-sidebar

> OpenCode v2 TUI sidebar для просмотра agents и subagents из текущего configuration source OhMyOpenAgent.

[![Package](https://img.shields.io/badge/npm-opencode--agents--sidebar-111827?style=for-the-badge&labelColor=111827&color=5b5ef4)](https://www.npmjs.com/package/opencode-agents-sidebar)
![Runtime](https://img.shields.io/badge/runtime-Bun-111827?style=for-the-badge&logo=bun&logoColor=5b5ef4)
![Host](https://img.shields.io/badge/host-OpenCode-111827?style=for-the-badge&labelColor=111827&color=5b5ef4)
![License](https://img.shields.io/badge/license-MIT-111827?style=for-the-badge&labelColor=111827&color=5b5ef4)

[English version](README.md)

| Поле | Значение |
|---|---|
| Статус | Активно поддерживаемый персональный OpenCode tool/plugin |
| Тип | OpenCode TUI plugin / host extension |
| Host app | OpenCode `>=2.0.32`; release smoke также проверен на текущей `2.1.2` |
| Package | `opencode-agents-sidebar` `3.1.0` |
| Runtime | Bun `>=1.3.0` |
| Проверки maintainer | `bun install --frozen-lockfile && bun run typecheck && bun test && bun run build:all && bun run verify:package` |

## Скриншоты

Plugin отображает agent categories и details внутри sidebar терминального UI OpenCode.

![All categories collapsed](assets/categories-collapsed.png)

![Categories expanded](assets/categories-expanded.png)

![Agent details](assets/agent-details.png)

## Сводка

- Показывает OpenCode agents в OpenCode sidebar.
- Читает agents из `oh-my-openagent.json` через normalized provider boundary; seam допускает будущий native OpenCode source, но текущий release не заявляет universal discovery.
- Группирует agents в нейтральные категории: primary, subagents, built-in, project, global, custom, disabled, hidden и other.
- Поддерживает сворачиваемые category sections и сворачиваемый главный sidebar panel.
- Показывает provider, model, variant, fallback и disabled-agent информацию согласно display settings.
- Поддерживает compact и split row layouts для разных terminal widths.
- Поддерживает provider, model и variant aliases для более короткого terminal output.
- Перезагружает configuration через directory watches с polling recovery и deterministic fingerprint comparison.
- Обрабатывает отсутствующие или некорректные configuration files явными состояниями sidebar.

## Быстрый старт

```sh
opencode plugin add opencode-agents-sidebar@3.1.0
```

## Установка

### OpenCode v2

Установите release через v2 plugin manager:

```sh
opencode plugin add opencode-agents-sidebar@3.1.0
```

Эквивалентная явная конфигурация:

```jsonc
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-agents-sidebar@3.1.0"]
}
```

Добавьте package один раз: в `~/.config/opencode/cli.json` либо в v2-поле
`plugins` файла `opencode.json(c)`. Порядок packages определяет порядок v2
sidebar contributions.

Этот major не поддерживает OpenCode v1. Пользователям v1 нужно закрепить
`opencode-agents-sidebar@1.0.8`; dual-runtime compatibility shim отсутствует.

### Локальный checkout для разработки

```sh
git clone https://github.com/Mark1708/opencode-agents-sidebar.git
cd opencode-agents-sidebar
bun install --frozen-lockfile
bun run build:all
bun run verify:package
```

Build создаёт отдельные v2 server и TUI definitions в `dist/`; package verifier
записывает `.artifacts/package.tgz`. Root shims в репозитории намеренно
отсутствуют.

## Совместимость

| Компонент | Поддерживаемая версия | Источник |
|---|---|---|
| Host app | OpenCode `>=2.0.32` (smoke на `2.0.32` и `2.1.2`) | Release smoke contract |
| Plugin API | `@opencode/plugin 2.0.32` | dependency в `package.json` |
| Theme API | `@opencode/theme 2.0.32` | peer dependency в `package.json` |
| TUI runtime | `@opentui/core >=0.5.17`, `@opentui/solid >=0.5.17`, `solid-js 1.9.12` | peer dependencies в `package.json` |
| Local runtime | Bun `>=1.3.0` | engine в `package.json` |
| TypeScript | `^5.5.0` | dev dependency в `package.json` |

## Конфигурация

Текущий release читает один source:

```text
~/.config/opencode/oh-my-openagent.json
```

Top-level sections `agents`, `agent_order`, `disabled_agents`, `team_mode` и
`tmux` — данные OhMyOpenAgent. `src/providers/omo.ts` нормализует их для
sidebar. Provider seam допускает будущий native OpenCode source, но native или
universal agent discovery не входят в этот release.

Минимальная полезная конфигурация:

```json
{
  "tui": {
    "sidebar_width": 34,
    "name_width": 18,
    "title": "Agents"
  }
}
```

При использовании текущего OhMyOpenAgent bootstrap source оставьте legacy category order, если хотите привычную группировку:

```json
{
  "tui": {
    "title": "Agents",
    "category_order": ["Orchestration", "Research", "Architecture", "Review", "Engineering", "Operations", "Analytics", "Consulting", "Other"]
  }
}
```

Полная документированная форма:

```json
{
  "tui": {
    "sidebar_width": 34,
    "name_width": 18,
    "poll_interval_ms": 2000,
    "title": "Agents",
    "category_order": ["Primary", "Subagents", "Built-in", "Project", "Global", "Custom", "Disabled", "Hidden", "Other"],
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

Поддерживаемые значения:

- `model_display`: `"inline"`, `"details-only"` или `"hidden"`.
- `show_disabled`: `"hidden"`, `"dimmed"` или `"grouped"`.
- `agent_row_mode`: `"compact"` или `"split"`.
- `symbols`: `"unicode"` или `"ascii"`.

В OpenCode v2 порядок sidebar contributions определяется порядком packages в
host-списке `plugins`.

## Использование

- Запустите OpenCode с установленным plugin.
- Sidebar появится справа в TUI.
- Нажмите на main header, чтобы свернуть или раскрыть весь sidebar.
- Нажмите на category headers, чтобы свернуть или раскрыть provider groups.
- Нажмите на agent row, чтобы показать model, variant и fallback details.
- Настройте width, model display, aliases и symbol mode в provider metadata/config.

## Категории агентов

Default product categories — нейтральные OpenCode/provider categories из `src/defaults.ts`:

| Категория | Примеры |
|---|---|
| Primary | Main OpenCode agents после добавления native provider |
| Subagents | OpenCode subagents после добавления native provider |
| Built-in | Built-in host agents |
| Project | Project-local agents |
| Global | User-level agents |
| Custom | Custom provider agents |
| Disabled | Disabled agents при grouped display |
| Hidden | Reserved category для providers, которые раскрывают hidden entries |
| Other | Agents, которые не сопоставлены с известной category |

Temporary OhMyOpenAgent bootstrap provider хранит legacy lifecycle mapping внутри `src/providers/omo.ts`, чтобы этот mapping не становился generic product model.

## Параметры отображения

По умолчанию sidebar использует `agent_row_mode: "compact"` с `model_display: "details-only"`. Это оставляет agent list сфокусированным на names, а selected agent показывает model details ниже строки.

Runtime display включает main header, optional team status line, раскрытые или свёрнутые categories, details-only agent rows и selected agent details:

```text
▼ Agents (33 active)
team 2/4
▼ Custom (5)
› local-helper
    mode primary
    source custom
    1°   zai-coding-plan/glm-5.1
    fb   openai/gpt-5.5
    fb   opencode/big-pickle
  reviewer
  planner
▶ Other (3)
```

- `agent_row_mode`: `"compact"` оставляет каждого agent в одной строке. `"split"` использует две строки, когда `model_display` равен `"inline"`.
- `model_display`: `"details-only"` показывает provider и model details только для selected agent. `"inline"` показывает model information в agent row. `"hidden"` скрывает model information из rows и details.

## Структура проекта

```text
.
├── assets/                    # Local screenshots для README
├── dist/                      # Собранный package output
├── src/
│   ├── agents/                # Normalized agent types, grouping, merge logic
│   ├── providers/             # AgentProvider boundary и source OhMyOpenAgent
│   ├── agents.ts              # Agent list/view-state helpers
│   ├── config.ts              # Raw JSON reading и sidebar config merge helpers
│   ├── config-watcher.ts      # Directory watches с polling recovery
│   ├── runtime.ts             # Runtime states, fingerprints, serialized reloads
│   ├── defaults.ts            # Neutral sidebar defaults
│   ├── format.ts              # Text formatting и display utilities
│   ├── index.ts               # OpenCode v2 server definition
│   ├── render.ts              # Единственная OpenTUI/Solid render boundary
│   ├── tui.ts                 # OpenCode v2 lifecycle и state ownership
│   └── types.ts               # TypeScript type definitions
├── package.json               # Package metadata, scripts, peer dependencies
├── tsconfig.json              # TypeScript configuration
└── LICENSE
```

## Устранение неполадок

- Если package не загружается, выполните `opencode plugin check` и убедитесь, что `opencode-agents-sidebar@3.1.0` один раз указан в v2-списке `plugins`.
- Если local build не загружается, выполните `bun run build:all && bun run verify:package` и проверьте `.artifacts/package.tgz` через disposable v2 wrapper.
- Если agents не отображаются, проверьте valid agent metadata в `~/.config/opencode/oh-my-openagent.json`.
- Missing и malformed configuration дают явные sidebar states и восстанавливаются после create, replace или edit.
- Если content обрезается, настройте `sidebar_width`, `name_width` или `agent_row_mode`.
- Если model names слишком длинные, используйте `model_aliases`, `provider_aliases` или `variant_aliases`.
- Если config changes не появляются, проверьте доступность configured path; после watch error native directory watching переходит на polling.

## Ограничения / безопасность

- Plugin читает local metadata OhMyOpenAgent, а не provider credentials. Native OpenCode agent discovery остаётся будущей provider implementation.
- Config reload использует directory watchers с polling recovery, deterministic fingerprints и generation-gated serialized reads.
- Поведение sidebar width ограничено terminal и OpenCode TUI rendering.
- Styling зависит от возможностей host OpenCode и OpenTUI theme.
- Example configuration values являются placeholders и могут настраиваться под локальную среду.

## Статус

Активно поддерживаемый персональный OpenCode tool/plugin. Public issues и improvements приветствуются, но проект в первую очередь поддерживается под workflow автора.

## Ссылки / лицензия

- Package: <https://www.npmjs.com/package/opencode-agents-sidebar>
- Repository: <https://github.com/Mark1708/opencode-agents-sidebar>
- Host app: <https://opencode.ai/>
- Включён в раздел Plugins курируемого каталога [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode).
- Лицензия: MIT, см. [`LICENSE`](LICENSE)
