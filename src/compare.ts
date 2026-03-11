import type { CompareMode } from "./types";

export function parseCompareMode(compare: string): CompareMode {
  if (compare === "uncommitted") {
    return { kind: "uncommitted" };
  }
  if (compare === "staged") {
    return { kind: "staged" };
  }
  if (compare.startsWith("base:")) {
    return { kind: "base", base: compare.slice("base:".length) };
  }
  if (compare.startsWith("commit:")) {
    return { kind: "commit", commit: compare.slice("commit:".length) };
  }
  if (compare.startsWith("range:")) {
    return { kind: "range", range: compare.slice("range:".length) };
  }
  return { kind: "range", range: compare };
}

export function describeCompareMode(mode: CompareMode): string {
  switch (mode.kind) {
    case "uncommitted":
      return "uncommitted changes vs HEAD";
    case "staged":
      return "staged changes vs HEAD";
    case "base":
      return `branch comparison against ${mode.base}`;
    case "commit":
      return `single commit ${mode.commit}`;
    case "range":
      return `range ${mode.range}`;
  }
}
