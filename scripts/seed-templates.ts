import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import { exercises, programs, programDays, programExercises } from "../lib/db/schema";
import { resolveLanguage } from "./language";

// 3x/week full-body — six compound movement patterns.
// `search` keys match exercises.name_en (English) so they stay locale-agnostic.
type Pattern = { search: string; sets: number; reps: number };
const DAYS: Pattern[][] = [
  // Day A — Pull / Squat / Push
  [
    { search: "pull-up", sets: 4, reps: 6 },
    { search: "barbell squat", sets: 4, reps: 6 },
    { search: "barbell bench press", sets: 4, reps: 6 },
  ],
  // Day B — Press / Row / Hinge
  [
    { search: "barbell seated overhead press", sets: 4, reps: 6 },
    { search: "barbell bent over row", sets: 4, reps: 8 },
    { search: "barbell deadlift", sets: 3, reps: 5 },
  ],
  // Day C — Mixed
  [
    { search: "pull-up", sets: 3, reps: 8 },
    { search: "barbell squat", sets: 3, reps: 8 },
    { search: "barbell bench press", sets: 3, reps: 8 },
    { search: "barbell bent over row", sets: 3, reps: 10 },
  ],
];

// Locale-specific display labels. `tr` falls back to `en`.
const LABELS: Record<string, { programName: string; description: string; dayNames: string[] }> = {
  en: {
    programName: "Full Body — 3 / Week",
    description:
      "Six compound patterns over three sessions: vertical pull, squat, horizontal push, vertical push, horizontal pull, hinge.",
    dayNames: ["Day A — Pull / Squat / Push", "Day B — Press / Row / Hinge", "Day C — Mixed"],
  },
  zh: {
    programName: "全身训练 — 每周 3 次",
    description:
      "三个训练日覆盖六大复合动作模式:垂直拉、深蹲、水平推、垂直推、水平拉、铰链。",
    dayNames: ["A 日 — 拉 / 蹲 / 推", "B 日 — 推 / 划 / 铰链", "C 日 — 综合"],
  },
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const lang = resolveLanguage();
  const labels = LABELS[lang] ?? LABELS.en;

  // The single global template (userId = null, isTemplate = true). Match by
  // isTemplate rather than name so changing LANGUAGE re-localizes the existing
  // row in place instead of inserting a duplicate.
  const existing = await db
    .select({ id: programs.id, name: programs.name })
    .from(programs)
    .where(eq(programs.isTemplate, true));

  if (existing.length > 0) {
    const row = existing[0];
    if (row.name === labels.programName) {
      console.log(`→ template already in lang="${lang}" ("${labels.programName}"); skipping`);
      await pool.end();
      return;
    }
    await db
      .update(programs)
      .set({ name: labels.programName, description: labels.description })
      .where(eq(programs.id, row.id));
    for (let d = 0; d < labels.dayNames.length; d++) {
      await db
        .update(programDays)
        .set({ name: labels.dayNames[d] })
        .where(and(eq(programDays.programId, row.id), eq(programDays.dayIndex, d)));
    }
    console.log(`✓ updated template to lang="${lang}" ("${labels.programName}")`);
    await pool.end();
    return;
  }

  // No template yet — create it (fresh install).
  const ex = await db.select({ id: exercises.id }).from(exercises).limit(1);
  if (ex.length === 0) {
    console.warn("→ exercises table empty; run seed:exercises first. skipping templates.");
    await pool.end();
    return;
  }

  const [prog] = await db
    .insert(programs)
    .values({
      userId: null,
      name: labels.programName,
      description: labels.description,
      isTemplate: true,
    })
    .returning({ id: programs.id });

  for (let d = 0; d < DAYS.length; d++) {
    const dayName = labels.dayNames[d] ?? `Day ${d + 1}`;
    const [dayRow] = await db
      .insert(programDays)
      .values({ programId: prog.id, dayIndex: d, name: dayName })
      .returning({ id: programDays.id });

    const patterns = DAYS[d];
    for (let i = 0; i < patterns.length; i++) {
      const p = patterns[i];
      const match = await db.execute<{ id: string }>(
        sql`select id from exercises where lower(name_en) like ${`%${p.search.toLowerCase()}%`} order by id limit 1`,
      );
      const exId = match.rows[0]?.id;
      if (!exId) {
        console.warn(`  no exercise match for "${p.search}", skipping`);
        continue;
      }
      await db.insert(programExercises).values({
        programDayId: dayRow.id,
        exerciseId: exId,
        orderIndex: i,
        targetSets: p.sets,
        targetReps: p.reps,
      });
    }
  }

  console.log(`✓ seeded template lang="${lang}" ("${labels.programName}")`);
  await pool.end();
}

main().catch((e) => {
  console.error("seed-templates failed:", e);
  process.exit(1);
});
