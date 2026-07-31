import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { foodEntries } from "@/lib/db/schema";

const Body = z.object({
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string().min(1),
  kcal: z.number().nullable().optional(),
  protein_g: z.number().nullable().optional(),
  carbs_g: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
  photoPath: z.string().nullable().optional(),
  consumedAt: z.string().datetime().optional(),
});

function n(v: number | null | undefined): string | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  return String(v);
}

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;
  const photoPath = v.photoPath && v.photoPath.length > 0 ? v.photoPath : null;
  const [row] = await db
    .insert(foodEntries)
    .values({
      userId: user.id,
      meal: v.meal,
      name: v.name,
      kcal: n(v.kcal),
      proteinG: n(v.protein_g),
      carbsG: n(v.carbs_g),
      fatG: n(v.fat_g),
      photoPath,
      source: photoPath ? "ai_photo" : "manual",
      ...(v.consumedAt ? { consumedAt: new Date(v.consumedAt) } : {}),
    })
    .returning({ id: foodEntries.id });
  return NextResponse.json({ id: row.id });
}
