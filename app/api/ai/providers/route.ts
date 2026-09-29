import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { aiProviders } from "@/lib/db/schema";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1).max(100),
  baseUrl: z.string().trim().min(1).max(300),
  apiKey: z.string().max(300).optional(),
  models: z.array(z.string().min(1).max(200)).max(200).optional(),
  enabled: z.boolean().optional(),
});

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function maskedKey(key: string | null | undefined): {
  apiKeyMasked: string;
  hasKey: boolean;
} {
  const hasKey = !!key;
  return { apiKeyMasked: hasKey ? `••••${key!.slice(-4)}` : "", hasKey };
}

export async function GET() {
  const { user } = await requireSession();
  const rows = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.userId, user.id))
    .orderBy(asc(aiProviders.createdAt));

  return NextResponse.json({
    providers: rows.map((p) => ({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      protocol: p.protocol,
      models: p.models ?? [],
      enabled: p.enabled,
      createdAt: p.createdAt,
      ...maskedKey(p.apiKey),
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

  const [row] = await db
    .insert(aiProviders)
    .values({
      userId: user.id,
      name: v.name,
      baseUrl: normalizeBaseUrl(v.baseUrl),
      apiKey: v.apiKey?.trim() || null,
      models: v.models ?? [],
      enabled: v.enabled ?? true,
    })
    .returning({ id: aiProviders.id });

  return NextResponse.json({ id: row.id }, { status: 201 });
}
