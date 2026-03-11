import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { BUILDER_EFFORT, BUILDER_MODEL, MAX_FILES } from "./constants";
import { fail } from "./errors";
import { renderPrompt } from "./prompts";
import type { BuilderResponse, ChangedFile } from "./types";
import { runCommand } from "./command";

export function builderSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    required: [
      "summary",
      "comparison_scope",
      "review_focus",
      "notes_for_final_reviewer",
      "warnings",
      "selected_files"
    ],
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      comparison_scope: { type: "string" },
      review_focus: { type: "array", items: { type: "string" } },
      notes_for_final_reviewer: { type: "array", items: { type: "string" } },
      warnings: { type: "array", items: { type: "string" } },
      selected_files: {
        type: "array",
        items: {
          type: "object",
          required: ["path", "rationale", "include_mode", "ranges"],
          additionalProperties: false,
          properties: {
            path: { type: "string" },
            rationale: { type: "string" },
            include_mode: { type: "string", enum: ["full", "slice"] },
            ranges: {
              type: "array",
              items: {
                type: "object",
                required: ["start_line", "end_line", "description"],
                additionalProperties: false,
                properties: {
                  start_line: { type: "integer", minimum: 1 },
                  end_line: { type: "integer", minimum: 1 },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  };
}

export function buildCodexPrompt(input: {
  compareDescription: string;
  changedFiles: ChangedFile[];
  statusText: string;
  recentLog: string;
}): string {
  const changedFilesBlock = input.changedFiles
    .map((entry) =>
      entry.previousPath
        ? `- [${entry.status}] ${entry.previousPath} -> ${entry.path}`
        : `- [${entry.status}] ${entry.path}`
    )
    .join("\n");

  return renderPrompt("context-builder", {
    max_files: String(MAX_FILES),
    compare_description: input.compareDescription,
    status_text: input.statusText || "(empty)",
    changed_files_block: changedFilesBlock || "(none)",
    recent_log: input.recentLog || "(no commits available)"
  });
}

export function parseBuilderResponse(raw: string): BuilderResponse {
  const trimmed = raw.trim();
  if (!trimmed) {
    fail("builder returned empty output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    fail(`builder output was not valid JSON:\n${trimmed}\n\n${String(error)}`);
  }

  if (!isBuilderResponse(parsed)) {
    fail(`builder output did not match the expected shape:\n${trimmed}`);
  }

  return parsed;
}

export function isBuilderResponse(value: unknown): value is BuilderResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.summary !== "string" ||
    typeof candidate.comparison_scope !== "string" ||
    !Array.isArray(candidate.review_focus) ||
    !Array.isArray(candidate.notes_for_final_reviewer) ||
    !Array.isArray(candidate.warnings) ||
    !Array.isArray(candidate.selected_files)
  ) {
    return false;
  }

  for (const item of [...candidate.review_focus, ...candidate.notes_for_final_reviewer, ...candidate.warnings]) {
    if (typeof item !== "string") {
      return false;
    }
  }

  for (const entry of candidate.selected_files) {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.path !== "string" ||
      typeof record.rationale !== "string" ||
      (record.include_mode !== "full" && record.include_mode !== "slice") ||
      !Array.isArray(record.ranges)
    ) {
      return false;
    }
    if (record.include_mode === "slice" && record.ranges.length === 0) {
      return false;
    }
  }

  return true;
}

export async function runCodexBuilder(
  repoRoot: string,
  compareDescription: string,
  changedFiles: ChangedFile[],
  statusText: string,
  recentLog: string
): Promise<BuilderResponse> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "review-bundle-"));
  const schemaPath = path.join(tempDir, "builder-schema.json");
  const outputPath = path.join(tempDir, "builder-output.json");

  await writeFile(schemaPath, JSON.stringify(builderSchema(), null, 2), "utf8");

  const prompt = buildCodexPrompt({
    compareDescription,
    changedFiles,
    statusText,
    recentLog
  });

  const args = [
    "codex",
    "-m",
    BUILDER_MODEL,
    "-a",
    "never",
    "-c",
    `model_reasoning_effort="${BUILDER_EFFORT}"`,
    "exec",
    "-C",
    repoRoot,
    "--sandbox",
    "read-only",
    "--color",
    "never",
    "--output-schema",
    schemaPath,
    "-o",
    outputPath,
    prompt
  ];

  const result = await runCommand(args, repoRoot);
  const rawOutput = await readFile(outputPath, "utf8").catch(() => "");
  await rm(tempDir, { recursive: true, force: true });

  if (result.code !== 0) {
    const detail = [result.stderr.trim(), result.stdout.trim(), rawOutput.trim()]
      .filter(Boolean)
      .join("\n");
    fail(`Codex builder failed.\n${detail}`);
  }

  return parseBuilderResponse(rawOutput);
}
