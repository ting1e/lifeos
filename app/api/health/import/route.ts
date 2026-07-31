import { NextRequest, NextResponse } from "next/server";
import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { bodyMetrics, profile } from "@/lib/db/schema";
import { rateLimit } from "@/lib/auth/rate-limit";

const Sample = z
  .object({
    recordedAt: z.string().min(1),
    weightKg: z.number().optional(),
    bodyFatPct: z.number().optional(),
    muscleMassKg: z.number().optional(),
    leanBodyMassKg: z.number().optional(),
  })
  .refine(
    (v) =>
      v.weightKg !== undefined ||
      v.bodyFatPct !== undefined ||
      v.muscleMassKg !== undefined ||
      v.leanBodyMassKg !== undefined,
    { message: "at_least_one_metric_required" },
  );

const Body = z.union([
  Sample,
  z.object({ samples: z.array(Sample).max(5000) }),
]);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!rateLimit(`health:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [p] = await db
    .select({ userId: profile.userId })
    .from(profile)
    .where(eq(profile.healthSyncToken, token))
    .limit(1);

  if (!p) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = p.userId;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const samples = "samples" in parsed.data ? parsed.data.samples : [parsed.data];

  if (samples.length === 0) {
    return NextResponse.json({ imported: 0, latestWeight: null });
  }

  const rows = samples.map((s) => ({
    userId,
    recordedAt: new Date(s.recordedAt),
    weightKg: s.weightKg != null ? String(s.weightKg) : null,
    bodyFatPct: s.bodyFatPct != null ? String(s.bodyFatPct) : null,
    muscleMassKg: s.muscleMassKg != null ? String(s.muscleMassKg) : null,
    leanBodyMassKg: s.leanBodyMassKg != null ? String(s.leanBodyMassKg) : null,
    source: "apple_health" as const,
  }));

  const deduped = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    const key = r.recordedAt.toISOString();
    const prev = deduped.get(key);
    if (prev) {
      prev.weightKg = prev.weightKg ?? r.weightKg;
      prev.bodyFatPct = prev.bodyFatPct ?? r.bodyFatPct;
      prev.muscleMassKg = prev.muscleMassKg ?? r.muscleMassKg;
      prev.leanBodyMassKg = prev.leanBodyMassKg ?? r.leanBodyMassKg;
    } else {
      deduped.set(key, { ...r });
    }
  }
  const uniqueRows = Array.from(deduped.values());

  await db
    .insert(bodyMetrics)
    .values(uniqueRows)
    .onConflictDoUpdate({
      target: [
        bodyMetrics.userId,
        bodyMetrics.recordedAt,
        bodyMetrics.source,
      ],
      set: {
        weightKg: sql`COALESCE(excluded."weight_kg", "body_metrics"."weight_kg")`,
        bodyFatPct: sql`COALESCE(excluded."body_fat_pct", "body_metrics"."body_fat_pct")`,
        muscleMassKg: sql`COALESCE(excluded."muscle_mass_kg", "body_metrics"."muscle_mass_kg")`,
        leanBodyMassKg: sql`COALESCE(excluded."lean_body_mass_kg", "body_metrics"."lean_body_mass_kg")`,
      },
    });

  await db.execute(sql`
    UPDATE profile SET weight_kg = (
      SELECT MIN(weight_kg::numeric) FROM body_metrics
      WHERE user_id = ${userId}
        AND weight_kg IS NOT NULL
        AND recorded_at::date = (
          SELECT MAX(recorded_at)::date FROM body_metrics
          WHERE user_id = ${userId} AND weight_kg IS NOT NULL
        )
    )
    WHERE user_id = ${userId}
  `);

  const [latest] = await db
    .select({ weightKg: bodyMetrics.weightKg })
    .from(bodyMetrics)
    .where(
      and(
        eq(bodyMetrics.userId, userId),
        sql`${bodyMetrics.weightKg} IS NOT NULL`,
      ),
    )
    .orderBy(desc(bodyMetrics.recordedAt))
    .limit(1);

  return NextResponse.json({
    imported: samples.length,
    latestWeight: latest?.weightKg ? Number(latest.weightKg) : null,
  });
}
