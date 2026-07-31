import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { bodyMetrics, profile } from "@/lib/db/schema";

const Body = z.object({
  displayName: z.string().max(80).optional().nullable(),
  heightCm: z.string().optional().or(z.number().optional()),
  weightKg: z.string().optional().or(z.number().optional()),
  age: z.string().optional().or(z.number().optional()),
  sex: z.enum(["m", "f"]).optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  goal: z.enum(["cut", "maintain", "bulk"]).optional(),
  targetWeightKg: z.string().optional().or(z.number().optional()),
});

function s(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return typeof v === "number" ? String(v) : (v as string);
}
function n(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const num = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;
  const displayName =
    v.displayName === undefined
      ? undefined
      : v.displayName === null || v.displayName.trim() === ""
        ? null
        : v.displayName.trim();
  const set: Record<string, string | number | null> = {};
  if (displayName !== undefined) set.displayName = displayName;
  if (v.heightCm !== undefined) set.heightCm = s(v.heightCm);
  if (v.weightKg !== undefined) set.weightKg = s(v.weightKg);
  if (v.age !== undefined) set.age = n(v.age);
  if (v.sex !== undefined) set.sex = v.sex;
  if (v.activityLevel !== undefined) set.activityLevel = v.activityLevel;
  if (v.goal !== undefined) set.goal = v.goal;
  if (v.targetWeightKg !== undefined) set.targetWeightKg = s(v.targetWeightKg);

  await db
    .insert(profile)
    .values({
      userId: user.id,
      displayName: displayName ?? null,
      heightCm: s(v.heightCm),
      weightKg: s(v.weightKg),
      age: n(v.age),
      sex: v.sex ?? null,
      activityLevel: v.activityLevel ?? null,
      goal: v.goal ?? null,
      targetWeightKg: s(v.targetWeightKg),
    })
    .onConflictDoUpdate({
      target: profile.userId,
      set,
    });

  const w = s(v.weightKg);
  if (w) {
    await db.insert(bodyMetrics).values({
      userId: user.id,
      weightKg: w,
      source: "manual",
    });
  }

  return NextResponse.json({ ok: true });
}
