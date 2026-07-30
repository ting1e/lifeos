import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, isNull } from "drizzle-orm";
import { exercises } from "../lib/db/schema";
import { exerciseNamesZh } from "../lib/i18n/exercise-zh";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const allIds = Object.keys(exerciseNamesZh);
  console.log(`→ ${allIds.length} zh name translations available`);

  let updated = 0;
  let skipped = 0;
  for (const id of allIds) {
    const result = await db
      .update(exercises)
      .set({ nameZh: exerciseNamesZh[id] })
      .where(and(eq(exercises.id, id), isNull(exercises.nameZh)))
      .returning({ id: exercises.id });
    if (result.length > 0) updated++;
    else skipped++;
  }

  console.log(
    `✓ zh names applied — updated ${updated}, skipped ${skipped} (already set or not found)`,
  );
  await pool.end();
}

main().catch((e) => {
  console.error("apply failed:", e);
  process.exit(1);
});
