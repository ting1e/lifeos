import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  programDays,
  programExercises,
  programs,
  profile,
  whoopRecovery,
  whoopSleep,
} from "@/lib/db/schema";
import { chatJson } from "@/lib/ai/client";
import { programGeneratorPrompt } from "@/lib/ai/prompts";
import { AiProgramSchema } from "@/lib/ai/schemas";

const Body = z.object({
  goal: z.enum(["strength", "hypertrophy", "fat_loss", "general", "endurance"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  daysPerWeek: z.coerce.number().int().min(2).max(6),
  sessionMinutes: z.coerce.number().int().min(20).max(180).default(60),
  equipment: z.array(z.string().min(1).max(40)).max(20).default([]),
  focus: z.string().max(400).optional(),
  injuries: z.string().max(400).optional(),
});

// Pick the closest exercise row given a search term + optional body_part /
// equipment hints. Falls back through name LIKE → body_part match → any.
async function matchExercise(input: {
  search: string;
  bodyPart?: string | null;
  equipment?: string | null;
}): Promise<string | null> {
  const term = input.search.toLowerCase().trim();
  if (!term) return null;

  // Build a few patterns from the most specific to the loosest. Word-by-word
  // intersection beats blind LIKE when the search has filler ("barbell back squat").
  const words = term.split(/[\s-]+/).filter((w) => w.length >= 3);
  const fullLike = `%${term}%`;

  // 1. exact-ish: name LIKE + body part match.
  if (input.bodyPart) {
    const m = await db.execute<{ id: string }>(
      sql`select id from exercises
          where lower(name_en) like ${fullLike}
            and lower(coalesce(body_part, '')) = ${input.bodyPart.toLowerCase()}
          order by length(name_en) asc limit 1`,
    );
    if (m.rows[0]?.id) return m.rows[0].id;
  }

  // 2. plain LIKE on full term.
  {
    const m = await db.execute<{ id: string }>(
      sql`select id from exercises
          where lower(name_en) like ${fullLike}
          order by length(name_en) asc limit 1`,
    );
    if (m.rows[0]?.id) return m.rows[0].id;
  }

  // 3. word intersection (every word must appear).
  if (words.length > 0) {
    const conditions = words.map((w) => sql`lower(name_en) like ${"%" + w + "%"}`);
    let cond = conditions[0];
    for (let i = 1; i < conditions.length; i++) cond = sql`${cond} and ${conditions[i]}`;
    const m = await db.execute<{ id: string }>(
      sql`select id from exercises where ${cond} order by length(name_en) asc limit 1`,
    );
    if (m.rows[0]?.id) return m.rows[0].id;
  }

  // 4. body part fallback — at least returns a sane exercise for that part.
  if (input.bodyPart) {
    const m = await db.execute<{ id: string }>(
      sql`select id from exercises
          where lower(coalesce(body_part, '')) = ${input.bodyPart.toLowerCase()}
          order by id limit 1`,
    );
    if (m.rows[0]?.id) return m.rows[0].id;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const { user } = await requireSession();

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const [prof] = await db.select({ whoopEnabled: profile.whoopEnabled }).from(profile).where(eq(profile.userId, user.id)).limit(1);
  const whoopEnabled = prof?.whoopEnabled ?? true;

  // Pull recent recovery/sleep so the prompt can adapt to current readiness.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);
  const recRows = whoopEnabled
    ? await db
        .select({ score: whoopRecovery.score })
        .from(whoopRecovery)
        .where(
          and(
            eq(whoopRecovery.userId, user.id),
            gte(whoopRecovery.date, fourteenDaysAgo.toISOString().slice(0, 10)),
          ),
        )
        .orderBy(desc(whoopRecovery.date))
        .limit(14)
    : [];
  const recoveryAvg =
    recRows.length > 0
      ? Math.round(
          recRows.reduce((a, r) => a + (r.score ?? 0), 0) / recRows.length,
        )
      : null;

  const sleepRows = whoopEnabled
    ? await db
        .select({ start: whoopSleep.start, end: whoopSleep.end })
        .from(whoopSleep)
        .where(and(eq(whoopSleep.userId, user.id), gte(whoopSleep.start, fourteenDaysAgo)))
        .orderBy(desc(whoopSleep.start))
        .limit(14)
    : [];
  const sleepAvgHours =
    sleepRows.length > 0
      ? sleepRows.reduce(
          (a, s) =>
            a +
            (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3_600_000,
          0,
        ) / sleepRows.length
      : null;

  const { system, prompt } = programGeneratorPrompt({
    locale: user.locale,
    goal: input.goal,
    level: input.level,
    daysPerWeek: input.daysPerWeek,
    sessionMinutes: input.sessionMinutes,
    equipment: input.equipment,
    focus: input.focus,
    injuries: input.injuries,
    recoveryAvg,
    sleepAvgHours,
  });

  let plan;
  try {
    plan = await chatJson({
      userId: user.id,
      kind: "plan",
      system,
      prompt,
      schema: AiProgramSchema,
      temperature: 0.5,
      maxTokens: 3500,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "ai_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }

  // Match every AI exercise to a real row in the exercises table before we
  // commit anything to the programs table.
  const resolvedDays: {
    name: string;
    exercises: {
      exerciseId: string;
      sets: number;
      reps: number;
      notes: string | null;
    }[];
  }[] = [];
  const unmatched: string[] = [];

  for (const day of plan.days) {
    const dayExs: (typeof resolvedDays)[number]["exercises"] = [];
    for (const ex of day.exercises) {
      const exerciseId = await matchExercise({
        search: ex.search,
        bodyPart: ex.body_part ?? null,
        equipment: ex.equipment ?? null,
      });
      if (!exerciseId) {
        unmatched.push(ex.search);
        continue;
      }
      const note = [
        ex.notes,
        ex.rest_seconds ? `rest ${ex.rest_seconds}s` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      dayExs.push({
        exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        notes: note || null,
      });
    }
    if (dayExs.length > 0) {
      resolvedDays.push({ name: day.name, exercises: dayExs });
    }
  }

  if (resolvedDays.length === 0) {
    return NextResponse.json(
      {
        error: "no_exercises_matched",
        detail: "AI returned exercises but none matched the exercise database.",
        unmatched,
      },
      { status: 422 },
    );
  }

  const [prog] = await db
    .insert(programs)
    .values({
      userId: user.id,
      name: plan.name,
      description: plan.description || null,
      isTemplate: false,
    })
    .returning({ id: programs.id });

  for (let d = 0; d < resolvedDays.length; d++) {
    const day = resolvedDays[d];
    const [dayRow] = await db
      .insert(programDays)
      .values({ programId: prog.id, dayIndex: d, name: day.name })
      .returning({ id: programDays.id });
    for (let i = 0; i < day.exercises.length; i++) {
      const e = day.exercises[i];
      await db.insert(programExercises).values({
        programDayId: dayRow.id,
        exerciseId: e.exerciseId,
        orderIndex: i,
        targetSets: e.sets,
        targetReps: e.reps,
        notes: e.notes,
      });
    }
  }

  return NextResponse.json({
    id: prog.id,
    name: plan.name,
    days: resolvedDays.length,
    unmatched,
  });
}
