import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";

export const runtime = "nodejs";

const Body = z.object({
  baseUrl: z.string().max(200).optional(),
  apiKey: z.string().max(200).optional(),
  textModel: z.string().max(100).optional(),
  imageModel: z.string().max(100).optional(),
  audioModel: z.string().max(100).optional(),
});

export async function GET() {
  const { user } = await requireSession();
  const [p] = await db
    .select({
      aiBaseUrl: profile.aiBaseUrl,
      aiApiKey: profile.aiApiKey,
      aiTextModel: profile.aiTextModel,
      aiImageModel: profile.aiImageModel,
      aiAudioModel: profile.aiAudioModel,
    })
    .from(profile)
    .where(eq(profile.userId, user.id))
    .limit(1);

  const key = p?.aiApiKey ?? null;
  const hasKey = !!key;
  const apiKeyMasked = hasKey ? `••••${key!.slice(-4)}` : "";

  return NextResponse.json({
    baseUrl: p?.aiBaseUrl ?? "",
    textModel: p?.aiTextModel ?? "",
    imageModel: p?.aiImageModel ?? "",
    audioModel: p?.aiAudioModel ?? "",
    apiKeyMasked,
    hasKey,
  });
}

export async function PATCH(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;

  const set: Record<string, string | null> = {};
  if (v.baseUrl !== undefined) set.aiBaseUrl = v.baseUrl.trim() || null;
  if (v.apiKey !== undefined && v.apiKey !== "") set.aiApiKey = v.apiKey.trim();
  if (v.textModel !== undefined) set.aiTextModel = v.textModel.trim() || null;
  if (v.imageModel !== undefined) set.aiImageModel = v.imageModel.trim() || null;
  if (v.audioModel !== undefined) set.aiAudioModel = v.audioModel.trim() || null;

  if (Object.keys(set).length > 0) {
    await db
      .insert(profile)
      .values({
        userId: user.id,
        aiBaseUrl: set.aiBaseUrl ?? null,
        aiApiKey: set.aiApiKey ?? null,
        aiTextModel: set.aiTextModel ?? null,
        aiImageModel: set.aiImageModel ?? null,
        aiAudioModel: set.aiAudioModel ?? null,
      })
      .onConflictDoUpdate({
        target: profile.userId,
        set,
      });
  }
  return NextResponse.json({ ok: true });
}
