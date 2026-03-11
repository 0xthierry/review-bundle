import { stat } from "node:fs/promises";
import path from "node:path";
import { parseCompareMode } from "./compare";
import { fail } from "./errors";
import type { ChangedFile, CompareMode } from "./types";
import { runCommand } from "./command";

export async function git(
  repoRoot: string,
  args: string[],
  stdin?: string,
  allowFailure = false
): Promise<string> {
  const result = await runCommand(["git", ...args], repoRoot, stdin);
  if (result.code !== 0 && !allowFailure) {
    fail(`git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

export async function getRepoRoot(cwd: string): Promise<string> {
  const output = await runCommand(["git", "rev-parse", "--show-toplevel"], cwd);
  if (output.code !== 0) {
    fail("this script must be run inside a git repository");
  }
  return output.stdout.trim();
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

export async function detectMainlineBranch(repoRoot: string): Promise<string | undefined> {
  for (const candidate of ["main", "master", "trunk"]) {
    const local = await runCommand(["git", "show-ref", "--verify", `refs/heads/${candidate}`], repoRoot);
    if (local.code === 0) {
      return candidate;
    }

    const remote = await runCommand(["git", "show-ref", "--verify", `refs/remotes/origin/${candidate}`], repoRoot);
    if (remote.code === 0) {
      return `origin/${candidate}`;
    }
  }
  return undefined;
}

export async function repoHasHead(repoRoot: string): Promise<boolean> {
  const result = await runCommand(["git", "rev-parse", "--verify", "HEAD"], repoRoot);
  return result.code === 0;
}

export async function determineCompareMode(repoRoot: string, compare: string): Promise<CompareMode> {
  if (compare !== "auto") {
    return parseCompareMode(compare);
  }

  const status = await git(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status.trim().length > 0) {
    return { kind: "uncommitted" };
  }

  const branch = (await git(repoRoot, ["branch", "--show-current"])).trim();
  const mainline = await detectMainlineBranch(repoRoot);
  if (branch && mainline && branch !== mainline && branch !== mainline.replace("origin/", "")) {
    return { kind: "base", base: mainline };
  }

  if (await repoHasHead(repoRoot)) {
    return { kind: "commit", commit: "HEAD" };
  }

  fail("could not infer a comparison scope. Use --compare explicitly.");
}

export async function collectGitPatch(repoRoot: string, mode: CompareMode): Promise<string> {
  const hasHead = await repoHasHead(repoRoot);
  switch (mode.kind) {
    case "uncommitted":
      if (!hasHead) {
        return git(repoRoot, [
          "diff",
          "--cached",
          "--binary",
          "--find-renames",
          "--find-copies",
          "--submodule=diff",
          "--root"
        ]);
      }
      return git(repoRoot, [
        "diff",
        "--binary",
        "--find-renames",
        "--find-copies",
        "--submodule=diff",
        "HEAD"
      ]);
    case "staged":
      if (!hasHead) {
        return git(repoRoot, [
          "diff",
          "--cached",
          "--binary",
          "--find-renames",
          "--find-copies",
          "--submodule=diff",
          "--root"
        ]);
      }
      return git(repoRoot, [
        "diff",
        "--cached",
        "--binary",
        "--find-renames",
        "--find-copies",
        "--submodule=diff",
        "HEAD"
      ]);
    case "base":
      return git(repoRoot, [
        "diff",
        "--binary",
        "--find-renames",
        "--find-copies",
        "--submodule=diff",
        `${mode.base}...HEAD`
      ]);
    case "commit":
      return git(repoRoot, ["show", "--binary", "--find-renames", "--submodule=diff", mode.commit]);
    case "range":
      return git(repoRoot, ["diff", "--binary", "--find-renames", "--find-copies", "--submodule=diff", mode.range]);
  }
}

export async function collectChangedFiles(repoRoot: string, mode: CompareMode): Promise<ChangedFile[]> {
  const entries: ChangedFile[] = [];
  const hasHead = await repoHasHead(repoRoot);

  const parseNameStatus = async (output: string) => {
    for (const line of output.split("\n")) {
      if (!line.trim()) {
        continue;
      }
      const parts = line.split("\t");
      const status = parts[0] ?? "";
      if ((status.startsWith("R") || status.startsWith("C")) && parts.length >= 3) {
        const nextPath = parts[2];
        entries.push({
          status,
          path: nextPath,
          previousPath: parts[1],
          existsInWorktree: await pathExists(path.join(repoRoot, nextPath))
        });
      } else if (parts.length >= 2) {
        const nextPath = parts[1];
        entries.push({
          status,
          path: nextPath,
          existsInWorktree: await pathExists(path.join(repoRoot, nextPath))
        });
      }
    }
  };

  switch (mode.kind) {
    case "uncommitted": {
      if (hasHead) {
        await parseNameStatus(
          await git(repoRoot, ["diff", "--name-status", "--find-renames", "--find-copies", "HEAD"])
        );
      } else {
        await parseNameStatus(await git(repoRoot, ["diff", "--cached", "--name-status", "--root"]));
      }
      const untracked = await git(repoRoot, ["ls-files", "--others", "--exclude-standard"]);
      for (const line of untracked.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        if (!entries.some((entry) => entry.path === trimmed)) {
          entries.push({
            status: "??",
            path: trimmed,
            existsInWorktree: true
          });
        }
      }
      break;
    }
    case "staged":
      if (hasHead) {
        await parseNameStatus(await git(repoRoot, ["diff", "--cached", "--name-status", "HEAD"]));
      } else {
        await parseNameStatus(await git(repoRoot, ["diff", "--cached", "--name-status", "--root"]));
      }
      break;
    case "base":
      await parseNameStatus(await git(repoRoot, ["diff", "--name-status", `${mode.base}...HEAD`]));
      break;
    case "commit":
      await parseNameStatus(await git(repoRoot, ["show", "--name-status", "--format=", mode.commit]));
      break;
    case "range":
      await parseNameStatus(await git(repoRoot, ["diff", "--name-status", mode.range]));
      break;
  }

  return entries;
}

export async function collectRecentLog(repoRoot: string, logCount: number): Promise<string> {
  const logOutput = await git(
    repoRoot,
    ["log", "--decorate", "--stat", "-n", String(logCount)],
    undefined,
    true
  );
  return logOutput.trim();
}

export async function collectStatus(repoRoot: string): Promise<string> {
  return (await git(repoRoot, ["status", "--short", "--branch"], undefined, true)).trim();
}
