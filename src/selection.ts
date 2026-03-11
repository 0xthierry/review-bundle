import path from "node:path";
import { fail } from "./errors";
import { pathExists } from "./git";
import type { BuilderResponse, ChangedFile, FileSelection } from "./types";

export function normalizeSelectionPath(repoRoot: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const absolute = path.resolve(repoRoot, normalized);
  if (!absolute.startsWith(repoRoot)) {
    fail(`builder returned a path outside the repository: ${relativePath}`);
  }
  return path.relative(repoRoot, absolute).replace(/\\/g, "/");
}

export async function ensureSelectedFiles(
  repoRoot: string,
  builder: BuilderResponse,
  changedFiles: ChangedFile[]
): Promise<FileSelection[]> {
  const deduped = new Map<string, FileSelection>();

  for (const selection of builder.selected_files) {
    const normalizedPath = normalizeSelectionPath(repoRoot, selection.path);
    if (selection.include_mode === "slice") {
      deduped.set(normalizedPath, {
        path: normalizedPath,
        rationale: selection.rationale,
        include_mode: "slice",
        ranges: selection.ranges
      });
    } else {
      deduped.set(normalizedPath, {
        path: normalizedPath,
        rationale: selection.rationale,
        include_mode: "full"
      });
    }
  }

  for (const changedFile of changedFiles) {
    if (!changedFile.existsInWorktree) {
      continue;
    }
    if (!deduped.has(changedFile.path) && (await pathExists(path.join(repoRoot, changedFile.path)))) {
      deduped.set(changedFile.path, {
        path: changedFile.path,
        rationale: "Auto-added because this file is part of the change set.",
        include_mode: "full"
      });
    }
  }

  return [...deduped.values()];
}
