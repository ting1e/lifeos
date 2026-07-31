import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  // PostgreSQL requires new enum values to be committed before they can be used.
  // Drizzle wraps all pending migrations in a single transaction, so an
  // ALTER TYPE ADD VALUE in one migration and its usage in another would fail
  // with error 55P04 ("unsafe use of new value"). Pre-apply enum additions
  // outside a transaction so they're committed before migrations run.
  await pool.query(`ALTER TYPE "public"."locale" ADD VALUE IF NOT EXISTS 'zh'`).catch(() => {});
  await pool.query(`ALTER TYPE "public"."metric_source" ADD VALUE IF NOT EXISTS 'apple_health'`).catch(() => {});

  console.log("→ running migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrations complete");
  await pool.end();
}

main().catch((e) => {
  console.error("migration failed:", e);
  process.exit(1);
});
