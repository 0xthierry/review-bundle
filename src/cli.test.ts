import { describe, expect, test } from "bun:test";
import { helpText, parseCli } from "./cli";

describe("parseCli", () => {
  test("returns help sentinel", () => {
    expect(parseCli(["--help"])).toBe("help");
  });

  test("parses compare and output", () => {
    expect(parseCli(["--compare", "staged", "--output", "review.md"])).toEqual({
      compare: "staged",
      output: "review.md"
    });
  });

  test("uses defaults", () => {
    expect(parseCli([])).toEqual({
      compare: "auto",
      output: undefined
    });
  });
});

test("helpText mentions fixed builder model", () => {
  expect(helpText()).toContain("gpt-5.3-codex");
});
