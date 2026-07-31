import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { foodLibrary } from "@/lib/db/schema";

export const runtime = "nodejs";

export type FoodSuggestion = {
  name: string;
  uses: number;
  lastUsed: string | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  meal: "breakfast" | "lunch" | "dinner" | "snack" | null;
  source: "history" | "library";
  photoPath?: string | null;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export async function GET(req: Request) {
  const { user } = await requireSession();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] satisfies FoodSuggestion[] });
  }

  // Group case/whitespace-insensitive on name so duplicate spellings merge.
  // Per-group we surface the most recent entry's macros (these are stable for
  // a known food), then rank by frequency + recency.
  const rows = await db.execute(sql`
    WITH ranked AS (
      SELECT
        lower(btrim(name)) AS norm,
        name,
        kcal::numeric AS kcal,
        protein_g::numeric AS protein_g,
        carbs_g::numeric AS carbs_g,
        fat_g::numeric AS fat_g,
        meal,
        photo_path,
        consumed_at,
        ROW_NUMBER() OVER (PARTITION BY lower(btrim(name)) ORDER BY consumed_at DESC) AS rn
      FROM food_entries
      WHERE user_id = ${user.id}
        AND name ILIKE ${"%" + q + "%"}
    ),
    grouped AS (
      SELECT
        norm,
        COUNT(*)::int AS uses,
        MAX(consumed_at) AS last_used
      FROM ranked
      GROUP BY norm
    )
    SELECT
      r.name,
      g.uses,
      g.last_used,
      r.kcal,
      r.protein_g,
      r.carbs_g,
      r.fat_g,
      r.meal,
      r.photo_path
    FROM grouped g
    JOIN ranked r ON r.norm = g.norm AND r.rn = 1
    ORDER BY g.uses DESC, g.last_used DESC
    LIMIT 8
  `);

  const historySuggestions: FoodSuggestion[] = (rows.rows as Array<Record<string, unknown>>).map((r) => ({
    name: String(r.name),
    uses: Number(r.uses),
    lastUsed: new Date(r.last_used as string).toISOString(),
    kcal: r.kcal == null ? null : Number(r.kcal),
    proteinG: r.protein_g == null ? null : Number(r.protein_g),
    carbsG: r.carbs_g == null ? null : Number(r.carbs_g),
    fatG: r.fat_g == null ? null : Number(r.fat_g),
    meal: (r.meal as FoodSuggestion["meal"]) ?? null,
    source: "history" as const,
    photoPath: r.photo_path == null ? null : String(r.photo_path),
  }));

  const libRows = await db
    .select()
    .from(foodLibrary)
    .where(eq(foodLibrary.userId, user.id));

  const libSuggestions: FoodSuggestion[] = libRows
    .filter((r) => norm(r.name).includes(norm(q)))
    .map((r) => ({
      name: r.name,
      uses: 0,
      lastUsed: null,
      kcal: r.kcal == null ? null : Number(r.kcal),
      proteinG: r.proteinG == null ? null : Number(r.proteinG),
      carbsG: r.carbsG == null ? null : Number(r.carbsG),
      fatG: r.fatG == null ? null : Number(r.fatG),
      meal: null,
      source: "library" as const,
      photoPath: r.photoPath,
    }));

  // Merge: library items take priority when names collide.
  const seen = new Set<string>();
  const merged: FoodSuggestion[] = [];
  for (const s of libSuggestions) {
    const n = norm(s.name);
    if (!seen.has(n)) {
      seen.add(n);
      merged.push(s);
    }
  }
  for (const s of historySuggestions) {
    const n = norm(s.name);
    if (!seen.has(n)) {
      seen.add(n);
      merged.push(s);
    }
  }

  return NextResponse.json({ suggestions: merged.slice(0, 8) });
}
