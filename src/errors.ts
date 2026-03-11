export function fail(message: string): never {
  throw new Error(message);
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
