import { describe, expect, test } from "bun:test";
import { approximateTokens, renderChangedFiles, sanitizeForTitle } from "./render";

describe("sanitizeForTitle", () => {
  test("normalizes text for filenames", () => {
    expect(sanitizeForTitle("Code Review Export (main)")).toBe("code-review-export-main");
  });
});

describe("renderChangedFiles", () => {
  test("renders renamed files", () => {
    expect(
      renderChangedFiles([
        {
          status: "R100",
          previousPath: "old.ts",
          path: "new.ts",
          existsInWorktree: true
        }
      ])
    ).toContain("old.ts -> new.ts");
  });
});

test("approximateTokens rounds up", () => {
  expect(approximateTokens("12345")).toBe(2);
});
