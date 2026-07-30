import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { exercises } from "../lib/db/schema";

if (process.env.HTTPS_PROXY) {
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY));
}

const DATASET_BASE =
  process.env.EXERCISES_DATASET_BASE ??
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main";
const DATASET_URL = `${DATASET_BASE}/data/exercises.json`;

type Raw = {
  id: string;
  name: string;
  category?: string;
  body_part?: string;
  equipment?: string;
  target?: string;
  muscle_group?: string;
  secondary_muscles?: string[];
  instructions?: { en?: string; tr?: string; zh?: string };
  instruction_steps?: { en?: string[]; tr?: string[]; zh?: string[] };
  image?: string;
  gif_url?: string;
};

function abs(rel: string | undefined): string | null {
  if (!rel) return null;
  if (rel.startsWith("http")) return rel;
  return `${DATASET_BASE}/${rel.replace(/^\//, "")}`;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const [{ count }] = await db.execute<{ count: string }>(
    sql`select count(*)::text as count from exercises`,
  ).then((r) => r.rows);
  if (Number(count) > 0) {
    console.log(`→ exercises already seeded (${count} rows); skipping`);
    await pool.end();
    return;
  }

  console.log(`→ fetching ${DATASET_URL}…`);
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const rows = (await res.json()) as Raw[];
  console.log(`→ ${rows.length} exercises fetched, inserting in batches…`);

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => {
      // Some entries have name already in Turkish; we keep both columns.
      const nameEn = (r.name ?? "").toString();
      return {
        id: r.id,
        nameEn,
        nameTr: nameEn, // dataset doesn't ship localized names; use en as fallback
        nameZh: null, // dataset doesn't ship localized names; falls back to nameEn in UI
        category: r.category ?? null,
        bodyPart: r.body_part ?? null,
        equipment: r.equipment ?? null,
        target: r.target ?? null,
        muscleGroup: r.muscle_group ?? null,
        secondaryMuscles: r.secondary_muscles ?? [],
        instructionsEn: r.instructions?.en ?? null,
        instructionsTr: r.instructions?.tr ?? null,
        instructionsZh: r.instructions?.zh ?? null,
        instructionStepsEn: r.instruction_steps?.en ?? [],
        instructionStepsTr: r.instruction_steps?.tr ?? [],
        instructionStepsZh: r.instruction_steps?.zh ?? [],
        imageUrl: abs(r.image),
        gifUrl: abs(r.gif_url),
      };
    });
    await db.insert(exercises).values(chunk).onConflictDoNothing();
    process.stdout.write(`  +${chunk.length} (${i + chunk.length}/${rows.length})\n`);
  }

  console.log("✓ exercises seeded");
  await pool.end();
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exit(1);
});
