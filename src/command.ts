export async function runCommand(
  args: string[],
  cwd: string,
  stdin?: string
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(args, {
    cwd,
    stdin: stdin ? new TextEncoder().encode(stdin) : "ignore",
    stdout: "pipe",
    stderr: "pipe"
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ]);

  return { code, stdout, stderr };
}
