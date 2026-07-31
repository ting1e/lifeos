import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { foodLibrary } from "@/lib/db/schema";

const Patch = z.object({
  name: z.string().min(1).optional(),
  kcal: z.union([z.string(), z.number(), z.null()]).optional(),
  protein_g: z.union([z.string(), z.number(), z.null()]).optional(),
  carbs_g: z.union([z.string(), z.number(), z.null()]).optional(),
  fat_g: z.union([z.string(), z.number(), z.null()]).optional(),
  photoPath: z.string().nullable().optional(),
});

function toNum(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;
  const patch: Record<string, unknown> = {};
  if (v.name !== undefined) patch.name = v.name;
  if (v.kcal !== undefined) patch.kcal = toNum(v.kcal);
  if (v.protein_g !== undefined) patch.proteinG = toNum(v.protein_g);
  if (v.carbs_g !== undefined) patch.carbsG = toNum(v.carbs_g);
  if (v.fat_g !== undefined) patch.fatG = toNum(v.fat_g);
  if (v.photoPath !== undefined) patch.photoPath = v.photoPath;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true });
  }
  await db
    .update(foodLibrary)
    .set(patch)
    .where(and(eq(foodLibrary.id, id), eq(foodLibrary.userId, user.id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await db
    .delete(foodLibrary)
    .where(and(eq(foodLibrary.id, id), eq(foodLibrary.userId, user.id)));
  return NextResponse.json({ ok: true });
}
