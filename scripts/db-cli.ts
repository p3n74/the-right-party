import path from "node:path";

type DbCommand = "generate" | "push" | "seed";

function parseDatabaseUrl(args: string[]): string | null {
  const databaseUrlArg = args.find((arg) => arg.startsWith("DATABASE_URL="));
  if (!databaseUrlArg) {
    return null;
  }

  const value = databaseUrlArg.slice("DATABASE_URL=".length).trim();
  return value.length > 0 ? value : null;
}

async function run(command: string[], cwd: string, databaseUrl: string) {
  const child = Bun.spawn(command, {
    cwd,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await child.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

async function main() {
  const [subcommand, ...restArgs] = process.argv.slice(2);
  const repoRoot = path.resolve(import.meta.dir, "..");
  const packagesDbDir = path.join(repoRoot, "packages/db");

  if (!subcommand || !["generate", "push", "seed"].includes(subcommand)) {
    console.error(
      "Usage: bun scripts/db-cli.ts <generate|push|seed> DATABASE_URL=postgresql://...",
    );
    process.exit(1);
    return;
  }

  const databaseUrl = parseDatabaseUrl(restArgs);
  if (!databaseUrl) {
    console.error("Missing DATABASE_URL. Pass it like:");
    console.error(
      "bun run db:push DATABASE_URL=postgresql://user:pass@host:5432/db",
    );
    process.exit(1);
    return;
  }

  const commandName = subcommand as DbCommand;

  if (commandName === "generate") {
    await run(["bun", "x", "prisma", "generate"], packagesDbDir, databaseUrl);
    return;
  }

  if (commandName === "push") {
    await run(["bun", "x", "prisma", "db", "push"], packagesDbDir, databaseUrl);
    return;
  }

  await run(["bun", "run", "src/seed.ts"], packagesDbDir, databaseUrl);
}

await main();
