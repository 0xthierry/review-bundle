# review-export

`review-export` builds a code review handoff bundle for ChatGPT 5.4 Pro.

It inspects the current git scope, asks `gpt-5.3-codex` to select the most relevant context files, and writes a Markdown bundle plus a JSON selection artifact.

## Requirements

- macOS or Linux
- `bun`
- `git`
- a working `codex` CLI login for the builder step

## Install From Source

From the repository root:

```bash
./install.sh
```

The installer:

- verifies the platform is macOS or Linux
- installs dependencies with Bun
- builds the CLI into `dist/`
- writes `~/.local/bin/review-export`

Important:

- this is a source install
- the installed command points back to this repository
- if you move or delete the repository, the installed command will stop working

If `~/.local/bin` is not already in your `PATH`, add this to your shell config:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Usage

```bash
review-export --compare auto
review-export --compare base:main
review-export --compare staged --output review.md
```

## Development

Run tests:

```bash
bun test
```

Build:

```bash
bun run build
```

Run directly from the repo:

```bash
bun run review-export -- --help
```
