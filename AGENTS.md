# AGENTS.md

## Project Overview

This repository contains `review-bundle`, a Bun + TypeScript CLI for building a code review handoff bundle for ChatGPT/Codex.

The tool:

- inspects the current git scope
- selects the most relevant context files
- writes a Markdown review bundle
- writes a JSON selection artifact

## Stack

- Bun
- TypeScript
- Biome
- Lefthook

## Working Rules

- Use Bun commands, not `npm` or `yarn`, unless there is a specific reason to do otherwise.
- Keep changes consistent with the existing CLI-focused TypeScript codebase.
- Prefer small, reviewable changes.
- Do not invent commands, workflows, or behavior that are not present in this repository.

## Commands

### Install

```bash
./install.sh
```

### Development

Run the CLI directly from the repository:

```bash
bun run review-bundle -- --help
```

### Build

```bash
bun run build
```

### Test

```bash
bun run test
```

### Lint

```bash
bun run lint
```

### Lint and fix

```bash
bun run lint:fix
```

### Typecheck

```bash
bun run typecheck
```

## Git Hooks

Lefthook is configured with:

- `pre-commit`: runs Biome lint fixes on staged TypeScript files
- `pre-push`: runs typecheck, lint, and test

## Commit Rules

Agents must use semantic commits for any commit they create. Use Conventional Commit style prefixes such as:

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`
- `chore:`

Examples:

```text
feat: add compare mode validation
fix: handle empty git diff in bundle builder
docs: document review-bundle install flow
```
