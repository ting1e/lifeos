import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { exercises } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireSession();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const bodyPart = (url.searchParams.get("body_part") ?? "").trim();
  const equipment = (url.searchParams.get("equipment") ?? "").trim();
  const limit = Math.min(60, Number(url.searchParams.get("limit") ?? 30));

  const rows = await db
    .select()
    .from(exercises)
    .where(sql`
      (${q ? sql`(lower(name_en) like ${`%${q}%`} or lower(coalesce(name_zh, '')) like ${`%${q}%`} or lower(coalesce(name_tr, '')) like ${`%${q}%`})` : sql`true`})
      and (${bodyPart ? sql`body_part = ${bodyPart}` : sql`true`})
      and (${equipment ? sql`equipment = ${equipment}` : sql`true`})
    `)
    .orderBy(exercises.id)
    .limit(limit);

  return NextResponse.json({ exercises: rows });
}
