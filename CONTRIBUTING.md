# Contributing

Thank you for your interest in contributing to the agents-sidebar plugin! This document provides guidelines for development contributions.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) >= 1.1.0
- [Node.js](https://nodejs.org/) >= 18.0.0 (for compatibility)

### Environment Setup

```bash
# Clone the repository
git clone https://github.com/oh-my-openagent/agents-sidebar.git
cd agents-sidebar

# Install dependencies
bun install

# Build the plugin
bun run build

# Run tests
bun test

# Type check
bun run typecheck
```

## Development Workflow

### 1. Code Style

- Follow existing patterns and conventions
- Use **immutable data structures** - never mutate existing objects
- Keep functions small (< 50 lines)
- Keep files focused (< 800 lines)
- No deep nesting (> 4 levels)
- Handle errors explicitly
- No hardcoded values (use constants or config)

### 2. Testing

- Write tests before implementing new features (TDD)
- Maintain 80%+ test coverage
- Run tests before committing:
  ```bash
  bun test
  ```

### 3. Commit Format

Use [conventional commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

[optional body]
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `refactor`: Code changes without new features or bug fixes
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat: add compact mode for agent display
fix: resolve sidebar width calculation issue
docs: update installation instructions
refactor: improve agent categorization logic
```

## Pull Request Process

### 1. Development Branch

- Fork the repository
- Create a feature branch from `main`
- Use descriptive branch names:
  ```bash
  git checkout -b feature/add-compact-mode
  git checkout -b fix/sidebar-width-calculation
  ```

### 2. Development Steps

1. Write tests for new functionality
2. Implement the feature
3. Ensure all tests pass
4. Run type checking: `bun run typecheck`
5. Update documentation if needed
6. Commit with descriptive messages

### 3. Pull Request

- Push to your fork and create a PR
- Include a clear description of changes
- Link to any related issues
- Ensure all automated checks pass
- Wait for review and feedback

### 4. PR Review

- Address all review comments
- Be responsive to feedback
- Keep PRs focused on single changes
- Update PR description based on feedback

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. Environment details (OS, Bun version, OpenCode version)
2. Steps to reproduce the issue
3. Expected vs actual behavior
4. Error messages (if any)
5. Relevant configuration snippets

### Feature Requests

For feature requests, provide:

1. Use case description
2. Expected behavior
3. Implementation suggestions (if any)
4. Relevant context

## Code Review Guidelines

### Review Criteria

- **Code Quality**: Readable, maintainable code
- **Functionality**: Feature works as expected
- **Testing**: Adequate test coverage
- **Documentation**: Updated as needed
- **Performance**: No significant performance regression
- **Security**: No security vulnerabilities

### Security First

- Never commit secrets or sensitive information
- Validate all external input
- Follow security best practices
- Report security issues privately

## Local Development

### Hot Reloading

The plugin uses polling-based config reload. For development:

```bash
# Build after changes
bun run build

# Test the changes in OpenCode
```

### Debugging

- Check OpenCode console for error messages
- Test with different configuration scenarios

## Getting Help

- [GitHub Issues](https://github.com/oh-my-openagent/agents-sidebar/issues)
- [GitHub Discussions](https://github.com/oh-my-openagent/agents-sidebar/discussions)
- OpenCode Discord community (if available)

## Release Process

Maintainers handle releases. The `prepublishOnly` script ensures proper building before publishing.

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.
