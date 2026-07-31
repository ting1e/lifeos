import "dotenv/config";
import { Pool, type PoolClient } from "pg";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

type JournalEntry = { tag: string; when: number; hash: string; sql: string };

function readJournal(migrationsFolder: string): JournalEntry[] {
  const journal = JSON.parse(
    readFileSync(`${migrationsFolder}/meta/_journal.json`, "utf8"),
  );
  return journal.entries.map((e: { tag: string; when: number }) => {
    const sql = readFileSync(`${migrationsFolder}/${e.tag}.sql`, "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    return { tag: e.tag, when: e.when, hash, sql };
  });
}

const TAGS_TABLE = "drizzle.__migration_tags";

async function ensureTagsTable(pool: Pool): Promise<boolean> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  const res = await pool.query(`SELECT to_regclass('${TAGS_TABLE}') AS t`);
  const existed = res.rows[0]?.t != null;
  await pool.query(`CREATE TABLE IF NOT EXISTS ${TAGS_TABLE} (
    tag text PRIMARY KEY,
    applied_at bigint NOT NULL
  )`);
  return existed;
}

async function bootstrapTags(
  pool: Pool,
  entries: JournalEntry[],
): Promise<void> {
  const existed = await ensureTagsTable(pool);
  if (existed) return;

  // Fresh installs have no legacy table — nothing to bootstrap from.
  const legacy = await pool.query(
    `SELECT to_regclass('drizzle.__drizzle_migrations') AS t`,
  );
  if (!legacy.rows[0]?.t) return;

  const rows = await pool.query(
    `SELECT hash, created_at FROM drizzle.__drizzle_migrations`,
  );
  if (rows.rows.length === 0) return;

  // Match legacy rows against the current journal:
  // 1. by SQL hash — exact proof that this migration ran;
  // 2. by created_at == journal "when" — covers migrations whose SQL file
  //    was edited after being applied (hash no longer matches).
  // Legacy rows that match nothing are stale dev artifacts and are ignored;
  // their journal counterparts (if any) will simply be applied by the migrator.
  const byHash = new Map(entries.map((e) => [e.hash, e]));
  const byWhen = new Map(entries.map((e) => [String(e.when), e]));
  const matched = new Map<string, JournalEntry>();
  let stale = 0;
  for (const row of rows.rows as Array<{ hash: string; created_at: string }>) {
    const hit = byHash.get(row.hash) ?? byWhen.get(String(row.created_at));
    if (hit) matched.set(hit.tag, hit);
    else stale++;
  }

  for (const e of matched.values()) {
    await pool.query(
      `INSERT INTO ${TAGS_TABLE} (tag, applied_at) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [e.tag, e.when],
    );
  }
  console.log(
    `→ bootstrapped ${matched.size} applied migrations from legacy table` +
      (stale > 0 ? ` (${stale} stale entries ignored)` : ""),
  );
}

async function applyMigration(
  client: PoolClient,
  entry: JournalEntry,
): Promise<void> {
  const statements = entry.sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  await client.query("BEGIN");
  try {
    for (const stmt of statements) {
      await client.query(stmt);
    }
    await client.query(
      `INSERT INTO ${TAGS_TABLE} (tag, applied_at) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [entry.tag, entry.when],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  }
}

async function migrateTagBased(
  pool: Pool,
  entries: JournalEntry[],
): Promise<void> {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT tag FROM ${TAGS_TABLE}`);
    const appliedTags = new Set(res.rows.map((r) => r.tag));

    let applied = 0;
    for (const entry of entries) {
      if (appliedTags.has(entry.tag)) continue;
      await applyMigration(client, entry);
      console.log(`✓ applied ${entry.tag}`);
      applied++;
    }
    if (applied === 0) console.log("✓ no pending migrations");
  } finally {
    client.release();
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });

  // PostgreSQL requires new enum values to be committed before they can be used.
  // Migrations run one per transaction, so an ALTER TYPE ADD VALUE in one
  // migration and its usage in another would fail with error 55P04 ("unsafe
  // use of new value"). Pre-apply enum additions outside any transaction so
  // they're committed before migrations run.
  await pool.query(`ALTER TYPE "public"."locale" ADD VALUE IF NOT EXISTS 'zh'`).catch(() => {});
  await pool.query(`ALTER TYPE "public"."metric_source" ADD VALUE IF NOT EXISTS 'apple_health'`).catch(() => {});

  const entries = readJournal("./drizzle");

  await bootstrapTags(pool, entries);

  console.log("→ running migrations…");
  await migrateTagBased(pool, entries);
  console.log("✓ migrations complete");
  await pool.end();
}

main().catch((e) => {
  console.error("migration failed:", e);
  process.exit(1);
});
