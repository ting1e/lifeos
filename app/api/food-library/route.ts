import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { foodLibrary } from "@/lib/db/schema";

const Body = z.object({
  name: z.string().min(1),
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

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  return Number(v);
}

export async function GET() {
  const { user } = await requireSession();
  const rows = await db
    .select()
    .from(foodLibrary)
    .where(eq(foodLibrary.userId, user.id));
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      kcal: toNumber(r.kcal),
      proteinG: toNumber(r.proteinG),
      carbsG: toNumber(r.carbsG),
      fatG: toNumber(r.fatG),
      photoPath: r.photoPath,
    })),
  });
}

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;

  // Upsert by name: if the user already has a library item with this name,
  // update its macros/photo instead of creating a duplicate.
  const [existing] = await db
    .select({ id: foodLibrary.id })
    .from(foodLibrary)
    .where(and(eq(foodLibrary.userId, user.id), eq(foodLibrary.name, v.name)));

  if (existing) {
    await db
      .update(foodLibrary)
      .set({
        kcal: toNum(v.kcal),
        proteinG: toNum(v.protein_g),
        carbsG: toNum(v.carbs_g),
        fatG: toNum(v.fat_g),
        photoPath: v.photoPath ?? null,
      })
      .where(eq(foodLibrary.id, existing.id));
    return NextResponse.json({ id: existing.id });
  }

  const [row] = await db
    .insert(foodLibrary)
    .values({
      userId: user.id,
      name: v.name,
      kcal: toNum(v.kcal),
      proteinG: toNum(v.protein_g),
      carbsG: toNum(v.carbs_g),
      fatG: toNum(v.fat_g),
      photoPath: v.photoPath ?? null,
    })
    .returning({ id: foodLibrary.id });
  return NextResponse.json({ id: row.id });
}
