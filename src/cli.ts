import { parseArgs } from "node:util";
import { HELP } from "./constants";
import type { Options } from "./types";

export function parseCli(args: string[]): Options | "help" {
  const parsed = parseArgs({
    args,
    options: {
      compare: { type: "string", default: "auto" },
      output: { type: "string" },
      help: { type: "boolean", default: false }
    },
    allowPositionals: false
  });

  if (parsed.values.help) {
    return "help";
  }

  return {
    compare: parsed.values.compare,
    output: parsed.values.output
  };
}

export function helpText(): string {
  return HELP;
}
