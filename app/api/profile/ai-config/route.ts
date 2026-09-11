import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";

export const runtime = "nodejs";

const maxTokensField = z
  .number()
  .int()
  .positive()
  .max(1_000_000)
  .nullable()
  .optional();

const Body = z.object({
  baseUrl: z.string().max(200).optional(),
  apiKey: z.string().max(200).nullable().optional(),
  textModel: z.string().max(100).optional(),
  imageModel: z.string().max(100).optional(),
  audioModel: z.string().max(100).optional(),
  imageBaseUrl: z.string().max(200).optional(),
  imageApiKey: z.string().max(200).nullable().optional(),
  audioBaseUrl: z.string().max(200).optional(),
  audioApiKey: z.string().max(200).nullable().optional(),
  textReasoning: z.string().max(50).optional(),
  textMaxTokens: maxTokensField,
  imageReasoning: z.string().max(50).optional(),
  imageMaxTokens: maxTokensField,
  audioReasoning: z.string().max(50).optional(),
  audioMaxTokens: maxTokensField,
});

function masked(key: string | null | undefined): {
  apiKeyMasked: string;
  hasKey: boolean;
} {
  const hasKey = !!key;
  return { apiKeyMasked: hasKey ? `••••${key!.slice(-4)}` : "", hasKey };
}

export async function GET() {
  const { user } = await requireSession();
  const [p] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, user.id))
    .limit(1);

  return NextResponse.json({
    baseUrl: p?.aiBaseUrl ?? "",
    textModel: p?.aiTextModel ?? "",
    imageModel: p?.aiImageModel ?? "",
    audioModel: p?.aiAudioModel ?? "",
    ...masked(p?.aiApiKey),
    text: {
      baseUrl: p?.aiBaseUrl ?? "",
      model: p?.aiTextModel ?? "",
      reasoning: p?.aiTextReasoning ?? "",
      maxTokens: p?.aiTextMaxTokens ?? null,
      ...masked(p?.aiApiKey),
    },
    image: {
      baseUrl: p?.aiImageBaseUrl ?? "",
      model: p?.aiImageModel ?? "",
      reasoning: p?.aiImageReasoning ?? "",
      maxTokens: p?.aiImageMaxTokens ?? null,
      ...masked(p?.aiImageApiKey),
    },
    audio: {
      baseUrl: p?.aiAudioBaseUrl ?? "",
      model: p?.aiAudioModel ?? "",
      reasoning: p?.aiAudioReasoning ?? "",
      maxTokens: p?.aiAudioMaxTokens ?? null,
      ...masked(p?.aiAudioApiKey),
    },
  });
}

export async function PATCH(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;

  const set: Partial<typeof profile.$inferInsert> = {};
  if (v.baseUrl !== undefined) set.aiBaseUrl = v.baseUrl.trim() || null;
  if (v.apiKey !== undefined) set.aiApiKey = v.apiKey === null || v.apiKey === "" ? null : v.apiKey.trim();
  if (v.textModel !== undefined) set.aiTextModel = v.textModel.trim() || null;
  if (v.imageModel !== undefined) set.aiImageModel = v.imageModel.trim() || null;
  if (v.audioModel !== undefined) set.aiAudioModel = v.audioModel.trim() || null;
  if (v.imageBaseUrl !== undefined) set.aiImageBaseUrl = v.imageBaseUrl.trim() || null;
  if (v.imageApiKey !== undefined) set.aiImageApiKey = v.imageApiKey === null || v.imageApiKey === "" ? null : v.imageApiKey.trim();
  if (v.audioBaseUrl !== undefined) set.aiAudioBaseUrl = v.audioBaseUrl.trim() || null;
  if (v.audioApiKey !== undefined) set.aiAudioApiKey = v.audioApiKey === null || v.audioApiKey === "" ? null : v.audioApiKey.trim();
  if (v.textReasoning !== undefined) set.aiTextReasoning = v.textReasoning.trim() || null;
  if (v.textMaxTokens !== undefined) set.aiTextMaxTokens = v.textMaxTokens;
  if (v.imageReasoning !== undefined) set.aiImageReasoning = v.imageReasoning.trim() || null;
  if (v.imageMaxTokens !== undefined) set.aiImageMaxTokens = v.imageMaxTokens;
  if (v.audioReasoning !== undefined) set.aiAudioReasoning = v.audioReasoning.trim() || null;
  if (v.audioMaxTokens !== undefined) set.aiAudioMaxTokens = v.audioMaxTokens;

  if (Object.keys(set).length > 0) {
    await db
      .insert(profile)
      .values({ userId: user.id, ...set })
      .onConflictDoUpdate({
        target: profile.userId,
        set,
      });
  }
  return NextResponse.json({ ok: true });
}
