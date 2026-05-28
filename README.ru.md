# opencode-agents-sidebar

> OpenCode TUI sidebar plugin для просмотра настроенных OhMyOpenAgent agents по lifecycle category, model, provider и status.

[![Package](https://img.shields.io/badge/npm-opencode--agents--sidebar-111827?style=for-the-badge&labelColor=111827&color=5b5ef4)](https://www.npmjs.com/package/opencode-agents-sidebar)
![Runtime](https://img.shields.io/badge/runtime-Bun-111827?style=for-the-badge&logo=bun&logoColor=5b5ef4)
![Host](https://img.shields.io/badge/host-OpenCode-111827?style=for-the-badge&labelColor=111827&color=5b5ef4)
![License](https://img.shields.io/badge/license-MIT-111827?style=for-the-badge&labelColor=111827&color=5b5ef4)

[English version](README.md)

| Поле | Значение |
|---|---|
| Статус | Активно поддерживаемый персональный OpenCode tool/plugin |
| Тип | OpenCode TUI plugin / host extension |
| Host app | Документирован OpenCode `>= v1.14.49`; peer dependency `@opencode-ai/plugin >=1.4.0` |
| Package | `opencode-agents-sidebar` `1.0.7`, опубликован в npm |
| Runtime | Bun `>=1.1.0` |
| Проверки maintainer | `bun install && bun run build:all && bun test && bun run typecheck` |

## Скриншоты

Plugin отображает agent categories и details внутри sidebar терминального UI OpenCode.

![All categories collapsed](assets/categories-collapsed.png)

![Categories expanded](assets/categories-expanded.png)

![Agent details](assets/agent-details.png)

## Сводка

- Показывает настроенных OhMyOpenAgent agents в OpenCode sidebar.
- Группирует agents по lifecycle categories: orchestration, research, architecture, review, engineering, operations, analytics и consulting.
- Поддерживает сворачиваемые category sections и сворачиваемый главный sidebar panel.
- Показывает provider, model, variant, fallback и disabled-agent информацию согласно display settings.
- Поддерживает compact и split row layouts для разных terminal widths.
- Поддерживает provider, model и variant aliases для более короткого terminal output.
- Перезагружает OhMyOpenAgent configuration через polling и fingerprint comparison.
- Обрабатывает отсутствующие или некорректные configuration files явными состояниями sidebar.

## Быстрый старт

```sh
# установить опубликованный OpenCode plugin глобально
opencode plugin opencode-agents-sidebar@latest --global --force

# опционально: собрать из локального checkout для разработки
git clone https://github.com/Mark1708/opencode-agents-sidebar.git
cd opencode-agents-sidebar
bun install
bun run build:all
```

Plugin читает общие данные OhMyOpenAgent и display settings sidebar из `~/.config/opencode/oh-my-openagent.json`.

## Установка

### Установка OpenCode plugin

```sh
opencode plugin opencode-agents-sidebar@latest --global --force
```

Это рекомендуемый путь для пользователей: plugin опубликован в npm, и OpenCode может установить его напрямую.

### Локальный checkout для разработки

```sh
git clone https://github.com/Mark1708/opencode-agents-sidebar.git
cd opencode-agents-sidebar
bun install
bun run build:all
```

Build создаёт plugin entry и TUI bundle в `dist/`.

## Совместимость

| Компонент | Поддерживаемая версия | Источник |
|---|---|---|
| Host app | OpenCode `>= v1.14.49` | README compatibility note |
| Plugin API | `@opencode-ai/plugin >=1.4.0` | `package.json` peer dependency |
| TUI runtime | `@opentui/solid >=0.1.0`, `solid-js >=1.8.0` | `package.json` peer dependencies |
| Local runtime | Bun `>=1.1.0` | `package.json` engines и Bun-based scripts |
| TypeScript | `^5.5.0` | `package.json` dev dependency |

## Конфигурация

Sidebar читает общий configuration file OhMyOpenAgent:

```text
~/.config/opencode/oh-my-openagent.json
```

Этот файл принадлежит ecosystem oh-my-opencode / oh-my-openagent. Sidebar-specific display options должны находиться только в секции `tui`.

Top-level sections вроде `agents`, `agent_order`, `disabled_agents`, `team_mode` и `tmux` — это общие данные OhMyOpenAgent. Sidebar отображает эти данные при наличии, но эти sections не являются отдельной configuration sidebar plugin.

Минимальная полезная конфигурация:

```json
{
  "tui": {
    "sidebar_width": 34,
    "name_width": 18,
    "title": "OmO Agents"
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

Поддерживаемые значения:

- `model_display`: `"inline"`, `"details-only"` или `"hidden"`.
- `show_disabled`: `"hidden"`, `"dimmed"` или `"grouped"`.
- `agent_row_mode`: `"compact"` или `"split"`.
- `symbols`: `"unicode"` или `"ascii"`.

## Использование

- Запустите OpenCode с установленным plugin.
- Sidebar появится справа в TUI.
- Нажмите на main header, чтобы свернуть или раскрыть весь sidebar.
- Нажмите на category headers, чтобы свернуть или раскрыть lifecycle groups.
- Нажмите на agent row, чтобы показать model, variant и fallback details.
- Настройте width, model display, aliases и symbol mode в `oh-my-openagent.json`.

## Категории агентов

Default lifecycle grouping берётся из `src/defaults.ts`:

| Категория | Примеры |
|---|---|
| Orchestration | `sisyphus`, `hephaestus`, `prometheus`, `atlas`, `sisyphus-junior` |
| Research | `oracle`, `librarian`, `explore`, `metis`, `momus`, `multimodal-looker` |
| Architecture | `planner`, `architect`, `code-architect` |
| Review | `code-reviewer`, `typescript-reviewer`, `python-reviewer`, `go-reviewer`, `rust-reviewer`, `java-reviewer`, `kotlin-reviewer`, `security-auditor`, `devops-reviewer` |
| Engineering | `backend-dev`, `test-writer`, `docs-writer` |
| Operations | `build-error-resolver`, `e2e-runner`, `release-manager`, `database-specialist` |
| Analytics | `data-analyst`, `vision-processor` |
| Consulting | `health-consultant` |
| Other | Agents, которые не сопоставлены с известной category |

## Параметры отображения

По умолчанию sidebar использует `agent_row_mode: "compact"` с `model_display: "details-only"`. Это оставляет agent list сфокусированным на names, а selected agent показывает model details ниже строки.

Runtime display включает main header, optional team status line, раскрытые или свёрнутые categories, details-only agent rows и selected agent details:

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

- `agent_row_mode`: `"compact"` оставляет каждого agent в одной строке. `"split"` использует две строки, когда `model_display` равен `"inline"`.
- `model_display`: `"details-only"` показывает provider и model details только для selected agent. `"inline"` показывает model information в agent row. `"hidden"` скрывает model information из rows и details.

## Структура проекта

```text
.
├── assets/                    # Local screenshots для README
├── dist/                      # Собранный package output
├── src/
│   ├── agents.ts              # Agent categorization и filtering logic
│   ├── config.ts              # Reading и merge logic для oh-my-openagent.json
│   ├── defaults.ts            # Default values и category mappings
│   ├── format.ts              # Text formatting и display utilities
│   ├── index.ts               # OpenCode plugin entry
│   ├── render.ts              # TUI plugin render entry
│   ├── tui.ts                 # Реализация TUI component
│   └── types.ts               # TypeScript type definitions
├── package.json               # Package metadata, scripts, peer dependencies
├── tsconfig.json              # TypeScript configuration
└── LICENSE
```

## Устранение неполадок

- Если plugin не загружается, снова выполните `opencode plugin opencode-agents-sidebar@latest --global --force` и перезапустите OpenCode.
- Если agents не отображаются, проверьте, что `~/.config/opencode/oh-my-openagent.json` существует и содержит configured agents.
- Если config некорректный, sidebar показывает явное invalid-configuration state.
- Если content обрезается, настройте `sidebar_width`, `name_width` или `agent_row_mode`.
- Если model names слишком длинные, используйте `model_aliases`, `provider_aliases` или `variant_aliases`.
- Если config changes не появляются сразу, дождитесь polling interval или перезапустите OpenCode.

## Ограничения / безопасность

- Plugin читает metadata локальной OhMyOpenAgent configuration, а не provider credentials.
- Config reload использует polling и fingerprint comparison вместо file watcher.
- Поведение sidebar width ограничено terminal и OpenCode TUI rendering.
- Styling зависит от возможностей host OpenCode и OpenTUI theme.
- Example configuration values являются placeholders и могут настраиваться под локальную среду.

## Статус

Активно поддерживаемый персональный OpenCode tool/plugin. Public issues и improvements приветствуются, но проект в первую очередь поддерживается под workflow автора.

## Ссылки / лицензия

- Package: <https://www.npmjs.com/package/opencode-agents-sidebar>
- Repository: <https://github.com/Mark1708/opencode-agents-sidebar>
- Host app: <https://opencode.ai/>
- Лицензия: MIT, см. [`LICENSE`](LICENSE)
