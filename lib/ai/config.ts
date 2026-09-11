import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";

export type ModelKind = "text" | "image" | "audio";

export type ModalityConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** "" = per-feature default; otherwise sent verbatim as OpenAI reasoning_effort. */
  reasoning: string;
  /** null = use per-feature defaults; otherwise overrides max_tokens for every call of this modality. */
  maxTokens: number | null;
  openrouter: boolean;
};

export type AiConfig = Record<ModelKind, ModalityConfig>;

const ENV_DEFAULT_MODEL = "gpt-4o-mini";

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

export async function getAiConfig(userId: string): Promise<AiConfig> {
  const [p] = await db
    .select({
      aiBaseUrl: profile.aiBaseUrl,
      aiApiKey: profile.aiApiKey,
      aiTextModel: profile.aiTextModel,
      aiImageModel: profile.aiImageModel,
      aiAudioModel: profile.aiAudioModel,
      aiImageBaseUrl: profile.aiImageBaseUrl,
      aiImageApiKey: profile.aiImageApiKey,
      aiAudioBaseUrl: profile.aiAudioBaseUrl,
      aiAudioApiKey: profile.aiAudioApiKey,
      aiTextReasoning: profile.aiTextReasoning,
      aiTextMaxTokens: profile.aiTextMaxTokens,
      aiImageReasoning: profile.aiImageReasoning,
      aiImageMaxTokens: profile.aiImageMaxTokens,
      aiAudioReasoning: profile.aiAudioReasoning,
      aiAudioMaxTokens: profile.aiAudioMaxTokens,
    })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);

  // Global connection (text modality) with env fallback. Image/audio fall
  // back to it when their own baseUrl/apiKey are not set.
  const globalBaseUrl = trimTrailingSlash(
    p?.aiBaseUrl || process.env.OPENAI_BASE_URL || "",
  );
  const globalApiKey = p?.aiApiKey || process.env.OPENAI_API_KEY || "";

  const mk = (
    baseUrl: string | null | undefined,
    apiKey: string | null | undefined,
    model: string | null | undefined,
    envModel: string | undefined,
    reasoning: string | null | undefined,
    maxTokens: number | null | undefined,
  ): ModalityConfig => {
    const resolvedBaseUrl = trimTrailingSlash(baseUrl || "") || globalBaseUrl;
    const resolvedApiKey = apiKey || globalApiKey;
    return {
      baseUrl: resolvedBaseUrl,
      apiKey: resolvedApiKey,
      model: model || envModel || ENV_DEFAULT_MODEL,
      reasoning: (reasoning ?? "").trim(),
      maxTokens: maxTokens ?? null,
      openrouter: resolvedBaseUrl.includes("openrouter"),
    };
  };

  return {
    text: mk(
      p?.aiBaseUrl,
      p?.aiApiKey,
      p?.aiTextModel,
      process.env.OPENAI_TEXT_MODEL,
      p?.aiTextReasoning,
      p?.aiTextMaxTokens,
    ),
    image: mk(
      p?.aiImageBaseUrl,
      p?.aiImageApiKey,
      p?.aiImageModel,
      process.env.OPENAI_IMAGE_MODEL,
      p?.aiImageReasoning,
      p?.aiImageMaxTokens,
    ),
    audio: mk(
      p?.aiAudioBaseUrl,
      p?.aiAudioApiKey,
      p?.aiAudioModel,
      process.env.OPENAI_AUDIO_MODEL,
      p?.aiAudioReasoning,
      p?.aiAudioMaxTokens,
    ),
  };
}

/** Throws `ai_not_configured` when the modality about to be used has no connection. */
export function requireModality(config: AiConfig, kind: ModelKind): ModalityConfig {
  const mod = config[kind];
  if (!mod.baseUrl || !mod.apiKey) {
    throw new Error("ai_not_configured");
  }
  return mod;
}
