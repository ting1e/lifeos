import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { workoutSets, workouts } from "@/lib/db/schema";

const Body = z.object({
  exerciseId: z.string().min(1),
  setIndex: z.number().int().nonnegative(),
  reps: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  rpe: z.number().int().min(0).max(10).nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const [w] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)))
    .limit(1);
  if (!w) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const rows = await db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.workoutId, id))
    .orderBy(asc(workoutSets.setIndex));
  return NextResponse.json({
    sets: rows.map((s) => ({
      id: s.id,
      exerciseId: s.exerciseId,
      setIndex: s.setIndex,
      reps: s.reps,
      weightKg: s.weightKg != null ? Number(s.weightKg) : null,
      rpe: s.rpe,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const [w] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, user.id)))
    .limit(1);
  if (!w) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const v = parsed.data;
  const [row] = await db
    .insert(workoutSets)
    .values({
      workoutId: id,
      exerciseId: v.exerciseId,
      setIndex: v.setIndex,
      reps: v.reps ?? null,
      weightKg: v.weightKg !== null && v.weightKg !== undefined ? String(v.weightKg) : null,
      rpe: v.rpe ?? null,
    })
    .returning({ id: workoutSets.id });
  return NextResponse.json({ id: row.id });
}
