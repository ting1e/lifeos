import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Generate against a copy: never alter committed migrations, even on failure.
async function fingerprint(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = join(prefix, entry.name);
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await fingerprint(path, relative));
    } else {
      const hash = createHash("sha256").update(await readFile(path)).digest("hex");
      files.push(`${relative}:${hash}`);
    }
  }
  return files.sort();
}

const temporary = await mkdtemp(join(tmpdir(), "lifeos-migrations-"));
try {
  const original = resolve("drizzle");
  const copy = join(temporary, "drizzle");
  const config = join(temporary, "drizzle.config.cjs");
  await cp(original, copy, { recursive: true });
  await writeFile(config, `module.exports = ${JSON.stringify({
    dialect: "postgresql",
    schema: resolve("lib/db/schema.ts"),
    out: "./drizzle",
  })};\n`);
  const result = spawnSync(process.execPath, [resolve("node_modules/drizzle-kit/bin.cjs"), "generate", "--config", config], {
    cwd: temporary,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Migration generation failed.");
  if (JSON.stringify(await fingerprint(original)) !== JSON.stringify(await fingerprint(copy))) {
    throw new Error("Schema has uncommitted migration changes. Run pnpm db:generate and commit the generated drizzle/ files.");
  }
  // drizzle-kit 0.30 can print an error and still exit 0. Require its explicit
  // no-change message too, so such failures cannot silently pass this check.
  if (!result.stdout?.includes("No schema changes, nothing to migrate")) {
    throw new Error("Migration generation did not confirm that the schema is unchanged.");
  }
  console.log("Migration snapshots match the current schema.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
