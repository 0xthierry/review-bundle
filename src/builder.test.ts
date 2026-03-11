import { describe, expect, test } from "bun:test";
import { buildCodexPrompt, isBuilderResponse, parseBuilderResponse } from "./builder";

describe("builder response parsing", () => {
  test("accepts valid builder output", () => {
    const raw = JSON.stringify({
      summary: "Summary",
      comparison_scope: "uncommitted changes vs HEAD",
      review_focus: ["correctness"],
      notes_for_final_reviewer: [],
      warnings: [],
      selected_files: [
        {
          path: "src/index.ts",
          rationale: "Changed entrypoint",
          include_mode: "full",
          ranges: []
        }
      ]
    });

    const parsed = parseBuilderResponse(raw);
    expect(parsed.selected_files).toHaveLength(1);
    expect(isBuilderResponse(parsed)).toBe(true);
  });

  test("rejects slice selections without ranges", () => {
    expect(
      isBuilderResponse({
        summary: "Summary",
        comparison_scope: "scope",
        review_focus: [],
        notes_for_final_reviewer: [],
        warnings: [],
        selected_files: [
          {
            path: "src/index.ts",
            rationale: "Need this slice",
            include_mode: "slice",
            ranges: []
          }
        ]
      })
    ).toBe(false);
  });
});

test("builder prompt includes selection cap", () => {
  const prompt = buildCodexPrompt({
    compareDescription: "uncommitted changes vs HEAD",
    changedFiles: [{ status: "M", path: "src/index.ts", existsInWorktree: true }],
    statusText: "## main",
    recentLog: "abc123 Initial commit"
  });

  expect(prompt).toContain("at most 18 files");
});
