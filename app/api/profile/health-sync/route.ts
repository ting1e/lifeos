import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { bodyMetrics, profile } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const { user } = await requireSession();
  const [p] = await db
    .select({ healthSyncToken: profile.healthSyncToken })
    .from(profile)
    .where(eq(profile.userId, user.id))
    .limit(1);

  const token = p?.healthSyncToken ?? null;
  const hasToken = !!token;
  const tokenMasked = hasToken ? `••••${token!.slice(-4)}` : "";

  const [lastSync] = await db
    .select({ recordedAt: bodyMetrics.recordedAt })
    .from(bodyMetrics)
    .where(
      and(
        eq(bodyMetrics.userId, user.id),
        eq(bodyMetrics.source, "apple_health"),
        sql`${bodyMetrics.weightKg} IS NOT NULL`,
      ),
    )
    .orderBy(desc(bodyMetrics.recordedAt))
    .limit(1);

  const syncUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/health/import`;

  return NextResponse.json({
    token,
    tokenMasked,
    hasToken,
    syncUrl,
    lastSyncAt: lastSync?.recordedAt ?? null,
  });
}

const Body = z.object({
  action: z.enum(["generate", "revoke"]),
});

export async function PATCH(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (parsed.data.action === "revoke") {
    await db
      .insert(profile)
      .values({ userId: user.id, healthSyncToken: null })
      .onConflictDoUpdate({
        target: profile.userId,
        set: { healthSyncToken: null },
      });
    return NextResponse.json({ ok: true, token: null });
  }

  const token = crypto.randomBytes(32).toString("hex");

  await db
    .insert(profile)
    .values({ userId: user.id, healthSyncToken: token })
    .onConflictDoUpdate({
      target: profile.userId,
      set: { healthSyncToken: token },
    });

  return NextResponse.json({ ok: true, token });
}
