import { describe, expect, test } from "bun:test";
import { describeCompareMode, parseCompareMode } from "./compare";

describe("parseCompareMode", () => {
  test("parses base scope", () => {
    expect(parseCompareMode("base:main")).toEqual({ kind: "base", base: "main" });
  });

  test("parses commit scope", () => {
    expect(parseCompareMode("commit:abc123")).toEqual({ kind: "commit", commit: "abc123" });
  });

  test("falls back to range scope", () => {
    expect(parseCompareMode("HEAD~3..HEAD")).toEqual({ kind: "range", range: "HEAD~3..HEAD" });
  });
});

describe("describeCompareMode", () => {
  test("describes staged scope", () => {
    expect(describeCompareMode({ kind: "staged" })).toBe("staged changes vs HEAD");
  });

  test("describes base scope", () => {
    expect(describeCompareMode({ kind: "base", base: "origin/main" })).toBe(
      "branch comparison against origin/main"
    );
  });
});
