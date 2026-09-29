import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { aiProviders } from "@/lib/db/schema";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  baseUrl: z.string().trim().min(1).max(300).optional(),
  /** undefined = keep current key; null/"" = clear; string = replace. */
  apiKey: z.string().max(300).nullable().optional(),
  models: z.array(z.string().min(1).max(200)).max(200).optional(),
  enabled: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const { user } = await requireSession();
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;

  const set: Partial<typeof aiProviders.$inferInsert> = {};
  if (v.name !== undefined) set.name = v.name;
  if (v.baseUrl !== undefined) set.baseUrl = v.baseUrl.replace(/\/+$/, "");
  if (v.apiKey !== undefined) set.apiKey = v.apiKey === null || v.apiKey === "" ? null : v.apiKey.trim();
  if (v.models !== undefined) set.models = v.models;
  if (v.enabled !== undefined) set.enabled = v.enabled;

  if (Object.keys(set).length > 0) {
    const updated = await db
      .update(aiProviders)
      .set(set)
      .where(and(eq(aiProviders.id, id), eq(aiProviders.userId, user.id)))
      .returning({ id: aiProviders.id });
    if (updated.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { user } = await requireSession();
  const { id } = await params;

  // Task configs referencing this provider cascade away and fall back to
  // defaults — the UI warns before calling this.
  const deleted = await db
    .delete(aiProviders)
    .where(and(eq(aiProviders.id, id), eq(aiProviders.userId, user.id)))
    .returning({ id: aiProviders.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
