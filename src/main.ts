import { writeFile } from "node:fs/promises";
import { LOG_COUNT } from "./constants";
import { toErrorMessage } from "./errors";
import { parseCli, helpText } from "./cli";
import { describeCompareMode } from "./compare";
import { runCodexBuilder } from "./builder";
import {
  collectChangedFiles,
  collectGitPatch,
  collectRecentLog,
  collectStatus,
  determineCompareMode,
  getRepoRoot,
  git
} from "./git";
import { buildMarkdownBundle, ensureOutputPath, approximateTokens } from "./render";
import { ensureSelectedFiles } from "./selection";

function log(message: string): void {
  console.error(`[review-export] ${message}`);
}

export async function run(argv: string[]): Promise<void> {
  const parsed = parseCli(argv);
  if (parsed === "help") {
    console.log(helpText());
    return;
  }

  const repoRoot = await getRepoRoot(process.cwd());
  const compareMode = await determineCompareMode(repoRoot, parsed.compare);
  const compareDescription = describeCompareMode(compareMode);
  const branch = (await git(repoRoot, ["branch", "--show-current"], undefined, true)).trim();
  const statusText = await collectStatus(repoRoot);
  const recentLog = await collectRecentLog(repoRoot, LOG_COUNT);
  const changedFiles = await collectChangedFiles(repoRoot, compareMode);
  const patch = await collectGitPatch(repoRoot, compareMode);

  log(`scope: ${compareDescription}`);
  log(`changed files detected: ${changedFiles.length}`);
  log("running Codex builder model=gpt-5.3-codex effort=xhigh");

  const builder = await runCodexBuilder(repoRoot, compareDescription, changedFiles, statusText, recentLog);
  const selections = await ensureSelectedFiles(repoRoot, builder, changedFiles);
  const title = `code review export (${compareMode.kind === "base" ? compareMode.base : compareMode.kind})`;
  const markdown = await buildMarkdownBundle({
    repoRoot,
    title,
    compareDescription,
    branch,
    statusText,
    recentLog,
    changedFiles,
    patch,
    builder,
    selections
  });

  const outputPath = await ensureOutputPath(repoRoot, parsed.output, title);
  await writeFile(outputPath, markdown, "utf8");

  const jsonPath = outputPath.replace(/\.md$/i, ".selection.json");
  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        compareMode,
        compareDescription,
        builder,
        selectedFiles: selections
      },
      null,
      2
    ),
    "utf8"
  );

  log(`wrote markdown bundle: ${outputPath}`);
  log(`wrote builder JSON: ${jsonPath}`);
  log(`approx prompt size: ${markdown.length.toLocaleString()} chars / ~${approximateTokens(markdown).toLocaleString()} tokens`);
}

export async function main(argv = Bun.argv.slice(2)): Promise<void> {
  try {
    await run(argv);
  } catch (error) {
    console.error(`error: ${toErrorMessage(error)}`);
    process.exit(1);
  }
}
