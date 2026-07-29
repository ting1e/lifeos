import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";

export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  textModel: string;
  imageModel: string;
  audioModel: string;
  openrouter: boolean;
};

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
    })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);

  const baseUrl = trimTrailingSlash(
    p?.aiBaseUrl || process.env.OPENAI_BASE_URL || "",
  );
  const apiKey = p?.aiApiKey || process.env.OPENAI_API_KEY || "";
  const textModel =
    p?.aiTextModel || process.env.OPENAI_TEXT_MODEL || ENV_DEFAULT_MODEL;
  const imageModel =
    p?.aiImageModel || process.env.OPENAI_IMAGE_MODEL || ENV_DEFAULT_MODEL;
  const audioModel =
    p?.aiAudioModel || process.env.OPENAI_AUDIO_MODEL || ENV_DEFAULT_MODEL;

  if (!baseUrl || !apiKey) {
    throw new Error("ai_not_configured");
  }

  return {
    baseUrl,
    apiKey,
    textModel,
    imageModel,
    audioModel,
    openrouter: baseUrl.includes("openrouter"),
  };
}
