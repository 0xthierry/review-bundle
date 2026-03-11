import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Mustache from "mustache";
import { parse } from "yaml";
import { fail } from "./errors";

type PromptDefinition = {
  name?: string;
  description?: string;
  variables?: string[];
  template: string;
};

type PromptVariables = Record<string, string | number>;

const promptsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "prompts");
const promptCache = new Map<string, PromptDefinition>();

function promptPath(name: string): string {
  return path.join(promptsDir, `${name}.yaml`);
}

function isPromptDefinition(value: unknown): value is PromptDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.template !== "string") {
    return false;
  }

  if (candidate.variables !== undefined) {
    if (!Array.isArray(candidate.variables) || !candidate.variables.every((entry) => typeof entry === "string")) {
      return false;
    }
  }

  if (candidate.name !== undefined && typeof candidate.name !== "string") {
    return false;
  }

  if (candidate.description !== undefined && typeof candidate.description !== "string") {
    return false;
  }

  return true;
}

export function loadPromptDefinition(name: string): PromptDefinition {
  const cached = promptCache.get(name);
  if (cached) {
    return cached;
  }

  const target = promptPath(name);
  let raw: string;
  try {
    raw = readFileSync(target, "utf8");
  } catch (error) {
    fail(`could not read prompt file ${target}: ${String(error)}`);
  }

  let parsed: unknown;
  try {
    parsed = parse(raw);
  } catch (error) {
    fail(`could not parse prompt file ${target}: ${String(error)}`);
  }

  if (!isPromptDefinition(parsed)) {
    fail(`prompt file ${target} does not match the expected shape`);
  }

  promptCache.set(name, parsed);
  return parsed;
}

export function renderPrompt(name: string, variables: PromptVariables = {}): string {
  const prompt = loadPromptDefinition(name);
  const requiredVariables = prompt.variables ?? [];
  const missing = requiredVariables.filter((variable) => variables[variable] === undefined);
  if (missing.length > 0) {
    fail(`prompt ${name} is missing required variables: ${missing.join(", ")}`);
  }

  return Mustache.render(prompt.template, variables);
}
