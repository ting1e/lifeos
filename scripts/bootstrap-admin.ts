import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { users } from "../lib/db/schema";
import { resolveLanguage } from "./language";

async function main() {
  const username = process.env.ADMIN_USERNAME ?? process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn("→ ADMIN_USERNAME or ADMIN_PASSWORD not set; skipping bootstrap");
    return;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing.length > 0) {
    console.log(`→ admin user already exists (${username}); skipping`);
    await pool.end();
    return;
  }

  const passwordHash = await hash(password, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  await db.insert(users).values({
    username,
    passwordHash,
    role: "admin",
    locale: resolveLanguage(),
  });

  console.log(`✓ bootstrapped admin user: ${username}`);
  await pool.end();
}

main().catch((e) => {
  console.error("bootstrap failed:", e);
  process.exit(1);
});
