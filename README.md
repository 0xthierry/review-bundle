# review-bundle

`review-bundle` builds a code review handoff bundle for ChatGPT 5.4 Pro.

It inspects the current git scope, asks `gpt-5.3-codex` to select the most relevant context files, and writes a Markdown bundle plus a JSON selection artifact.

## Requirements

- macOS or Linux
- `bun`
- `git`
- a working `codex` CLI login for the builder step

## Install

Install the latest GitHub release:

```bash
curl -fsSL https://raw.githubusercontent.com/0xthierry/review-bundle/main/install.sh | sh
```

Install a specific release:

```bash
curl -fsSL https://raw.githubusercontent.com/0xthierry/review-bundle/main/install.sh | sh -s -- --version vX.Y.Z
```

The installer:

- downloads a versioned release artifact from GitHub Releases
- installs the bundle under `~/.local/share/review-bundle`
- writes `~/.local/bin/review-bundle`

Important:

- `bun` is still required at runtime
- `git` and a working `codex` CLI login are required when you actually run reviews

If `~/.local/bin` is not already in your `PATH`, add this to your shell config:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Development

Run from a local checkout:

```bash
bun install
bun run build
bun run review-bundle -- --help
```

Install the current checkout into `~/.local/bin` for local development:

```bash
./scripts/install-from-source.sh
```

## Usage

```bash
review-bundle --compare auto
review-bundle --compare base:main
review-bundle --compare staged --output review.md
```

Run tests:

```bash
bun test
```

## Releases

Releases and `CHANGELOG.md` are managed by `release-please` from Conventional Commits.

Use commit titles like:

```text
feat: add support for custom output paths
fix: handle deleted files in selected context
feat!: change the default comparison behavior
```
