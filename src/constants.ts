export const BUILDER_MODEL = "gpt-5.3-codex";
export const BUILDER_EFFORT = "xhigh";
export const MAX_FILES = 18;
export const LOG_COUNT = 10;

export const HELP = `review-bundle

Build a code review handoff bundle for ChatGPT 5.4 Pro.

Usage:
  bun run review-bundle -- [options]

Options:
  --compare <spec>         auto | uncommitted | staged | base:<branch> | commit:<sha> | range:<revset>
                           default: auto
  --output <path>          Save markdown bundle to this path.
                           default: .review-bundle/<timestamp>-review-bundle.md
  --help                   Show this help.

Examples:
  bun run review-bundle -- --compare auto
  bun run review-bundle -- --compare base:main
  bun run review-bundle -- --compare staged --output review.md

Notes:
  - The builder model is fixed to ${BUILDER_MODEL}.
  - The builder reasoning effort is fixed to ${BUILDER_EFFORT}.
`;
