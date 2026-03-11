import { describe, expect, test } from "bun:test";
import { loadPromptDefinition, renderPrompt } from "./prompts";

describe("loadPromptDefinition", () => {
  test("loads the context builder prompt from yaml", () => {
    const prompt = loadPromptDefinition("context-builder");

    expect(prompt.name).toBe("context-builder");
    expect(prompt.variables).toContain("compare_description");
    expect(prompt.template).toContain("deep code review handoff");
  });
});

describe("renderPrompt", () => {
  test("renders required variables", () => {
    const rendered = renderPrompt("context-builder", {
      max_files: "18",
      compare_description: "uncommitted changes vs HEAD",
      status_text: "## main",
      changed_files_block: "- [M] src/index.ts",
      recent_log: "abc123 Initial commit"
    });

    expect(rendered).toContain("at most 18 files");
    expect(rendered).toContain("uncommitted changes vs HEAD");
    expect(rendered).toContain("- [M] src/index.ts");
  });

  test("fails when required variables are missing", () => {
    expect(() => renderPrompt("context-builder")).toThrow(
      "prompt context-builder is missing required variables"
    );
  });

  test("renders the final review prompt without variables", () => {
    const rendered = renderPrompt("final-review");

    expect(rendered).toContain("You are reviewing code changes with git diffs included in the prompt.");
    expect(rendered).toContain("P0 (Must fix)");
  });
});
