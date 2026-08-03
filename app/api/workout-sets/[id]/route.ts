import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { workoutSets, workouts } from "@/lib/db/schema";

const Body = z.object({
  reps: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  rpe: z.number().int().min(0).max(10).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Ensure the set belongs to a workout owned by the user.
  const [row] = await db
    .select({ setId: workoutSets.id, workoutId: workoutSets.workoutId })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(and(eq(workoutSets.id, id), eq(workouts.userId, user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const v = parsed.data;
  const updates: Record<string, unknown> = {};
  if (v.reps !== undefined) updates.reps = v.reps;
  if (v.weightKg !== undefined)
    updates.weightKg =
      v.weightKg !== null && v.weightKg !== undefined ? String(v.weightKg) : null;
  if (v.rpe !== undefined) updates.rpe = v.rpe;

  if (Object.keys(updates).length > 0) {
    await db.update(workoutSets).set(updates).where(eq(workoutSets.id, id));
  }

  return NextResponse.json({ id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await requireSession();
  const { id } = await params;

  const [row] = await db
    .select({ setId: workoutSets.id })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(and(eq(workoutSets.id, id), eq(workouts.userId, user.id)))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.delete(workoutSets).where(eq(workoutSets.id, id));
  return NextResponse.json({ ok: true });
}
