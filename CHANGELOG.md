# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - 2025-05-22

### Fixed

- Point `exports["./tui"]` to `dist/tui.js` so npm package loading resolves the built TUI bundle.

## [1.0.6] - 2025-05-22

### Fixed

- Replace `prepublishOnly` with a no-op because CI already builds `dist/` before publishing.

## [1.0.5] - 2025-05-22

### Changed

- Bump package version to `1.0.5` for the npm release flow.

## [1.0.4] - 2025-05-22

### Fixed
- Add `.js` extension to test import (`./tui` -> `./tui.js`) for Bun 1.2 compatibility

## [1.0.3] - 2025-05-22

### Added

- CHANGELOG.md (Keep a Changelog format).
- npm version and license badges to README.
- Contributing guidelines with code style rules.

### Changed

- README: replaced `npm install` with `bun add`.
- LICENSE: updated copyright to MIT, Mark1708, 2025-2026.
- package.json: homepage now points to npm.
- .gitignore: added `*.tgz`.

### Removed

- Unused GitHub Actions workflow.

## [1.0.2] - 2025-05-22

### Added

- Initial changelog tracking for opencode-agents-sidebar.

[1.0.7]: https://github.com/Mark1708/opencode-agents-sidebar/releases/tag/v1.0.7
[1.0.6]: https://github.com/Mark1708/opencode-agents-sidebar/releases/tag/v1.0.6
[1.0.5]: https://github.com/Mark1708/opencode-agents-sidebar/releases/tag/v1.0.5
[1.0.4]: https://github.com/Mark1708/opencode-agents-sidebar/releases/tag/v1.0.4
[1.0.3]: https://github.com/Mark1708/opencode-agents-sidebar/releases/tag/v1.0.3
[1.0.2]: https://github.com/Mark1708/opencode-agents-sidebar/releases/tag/v1.0.2
