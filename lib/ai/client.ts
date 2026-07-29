import { fal } from "@fal-ai/client";
import { db } from "@/lib/db/client";
import { aiMessages } from "@/lib/db/schema";

let configured = false;
function configure() {
  if (configured) return;
  const key = process.env.FAL_KEY;
  if (key) fal.config({ credentials: key });
  configured = true;
}

export type AiKind = "food_vision" | "plan" | "insights" | "freeform";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";
const TEXT_ENDPOINT = "openrouter/router";
const VISION_ENDPOINT = "openrouter/router/vision";

export type ChatArgs = {
  userId: string;
  kind: AiKind;
  prompt: string;
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /**
   * Append `:online` to the resolved model id so OpenRouter's web-search
   * variant handles the request. Useful for nutrition lookups where the
   * model needs current portion / brand data.
   */
  webSearch?: boolean;
};

export type VisionArgs = ChatArgs & {
  imageUrls: string[];
};

export type ChatResult = {
  text: string;
  raw: unknown;
};

type OpenRouterOutput = {
  output?: string;
  error?: unknown;
  usage?: { cost?: number; total_tokens?: number };
};

function extractCostCents(raw: unknown): string | null {
  const out = (raw as { usage?: { cost?: number } } | null)?.usage;
  if (!out || typeof out.cost !== "number") return null;
  return (out.cost * 100).toFixed(4);
}

async function callEndpoint(
  endpoint: string,
  input: Record<string, unknown>,
): Promise<OpenRouterOutput> {
  const res = await fal.subscribe(endpoint, { input: input as never });
  const data = (res as { data?: unknown })?.data ?? res;
  return data as OpenRouterOutput;
}

function resolveModel(model: string | undefined, webSearch: boolean | undefined) {
  const base = model ?? DEFAULT_MODEL;
  if (!webSearch) return base;
  // Don't double-append if caller already added the suffix.
  return base.endsWith(":online") ? base : `${base}:online`;
}

export async function chat(args: ChatArgs): Promise<ChatResult> {
  configure();
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY is not configured");

  const input: Record<string, unknown> = {
    model: resolveModel(args.model, args.webSearch),
    prompt: args.prompt,
    temperature: args.temperature ?? 0.4,
    max_tokens: args.maxTokens ?? 2048,
  };
  if (args.system) input.system_prompt = args.system;

  let raw: OpenRouterOutput | null = null;
  let errorMsg: string | null = null;
  try {
    raw = await callEndpoint(TEXT_ENDPOINT, input);
    if (raw?.error) {
      errorMsg = typeof raw.error === "string" ? raw.error : JSON.stringify(raw.error);
      throw new Error(errorMsg);
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    await db
      .insert(aiMessages)
      .values({
        userId: args.userId,
        kind: args.kind,
        prompt: { input },
        response: (raw as object | null) ?? null,
        model: (input.model as string) ?? null,
        costCents: extractCostCents(raw),
        errorMsg,
      })
      .catch(() => {});
  }

  return { text: raw?.output ?? "", raw };
}

export async function vision(args: VisionArgs): Promise<ChatResult> {
  configure();
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY is not configured");

  const input: Record<string, unknown> = {
    model: args.model ?? DEFAULT_MODEL,
    prompt: args.prompt,
    image_urls: args.imageUrls,
    temperature: args.temperature ?? 0.3,
    max_tokens: args.maxTokens ?? 1024,
  };
  if (args.system) input.system_prompt = args.system;

  let raw: OpenRouterOutput | null = null;
  let errorMsg: string | null = null;
  try {
    raw = await callEndpoint(VISION_ENDPOINT, input);
    if (raw?.error) {
      errorMsg = typeof raw.error === "string" ? raw.error : JSON.stringify(raw.error);
      throw new Error(errorMsg);
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    await db
      .insert(aiMessages)
      .values({
        userId: args.userId,
        kind: args.kind,
        prompt: { input },
        response: (raw as object | null) ?? null,
        model: (input.model as string) ?? null,
        costCents: extractCostCents(raw),
        errorMsg,
      })
      .catch(() => {});
  }

  return { text: raw?.output ?? "", raw };
}

function tryParse(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function chatJson<T>(
  args: ChatArgs & { schema: import("zod").ZodSchema<T> },
): Promise<T> {
  const { schema, ...rest } = args;
  const first = await chat(rest);
  const parsed = tryParse(first.text);
  if (parsed) {
    const validated = schema.safeParse(parsed);
    if (validated.success) return validated.data;
  }
  // One self-correction attempt
  const retry = await chat({
    ...rest,
    prompt: `${rest.prompt}\n\nYour previous response was not valid JSON. Return ONLY a single JSON object matching the schema. No markdown, no prose.\n\nPrevious response:\n${first.text}`,
  });
  const retryParsed = tryParse(retry.text);
  return schema.parse(retryParsed);
}

export async function visionJson<T>(
  args: VisionArgs & { schema: import("zod").ZodSchema<T> },
): Promise<T> {
  const { schema, ...rest } = args;
  const first = await vision(rest);
  const parsed = tryParse(first.text);
  if (parsed) {
    const validated = schema.safeParse(parsed);
    if (validated.success) return validated.data;
  }
  const retry = await vision({
    ...rest,
    prompt: `${rest.prompt}\n\nReturn ONLY a single JSON object. No markdown, no prose.`,
  });
  const retryParsed = tryParse(retry.text);
  return schema.parse(retryParsed);
}

export async function uploadLocal(filePath: string): Promise<string> {
  configure();
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const buf = await fs.readFile(filePath);
  const name = path.basename(filePath);
  const blob = new Blob([buf]);
  const file = new File([blob], name);
  const url = await fal.storage.upload(file);
  return url;
}

export async function uploadBuffer(
  buf: Buffer | Uint8Array,
  filename: string,
  contentType?: string,
): Promise<string> {
  configure();
  const blob = new Blob([buf as BlobPart], contentType ? { type: contentType } : undefined);
  const file = new File([blob], filename, contentType ? { type: contentType } : undefined);
  return await fal.storage.upload(file);
}

const TRANSCRIBE_ENDPOINT = "fal-ai/wizper";

export type TranscribeArgs = {
  userId: string;
  audioUrl: string;
  language?: "tr" | "en" | "zh" | null;
};

export async function transcribeAudio(args: TranscribeArgs): Promise<{ text: string; raw: unknown }> {
  configure();
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY is not configured");

  const input: Record<string, unknown> = {
    audio_url: args.audioUrl,
    task: "transcribe",
    language: args.language ?? null,
    chunk_level: "segment",
    version: "3",
  };

  let raw: unknown = null;
  let errorMsg: string | null = null;
  try {
    const res = await fal.subscribe(TRANSCRIBE_ENDPOINT, { input: input as never });
    raw = (res as { data?: unknown })?.data ?? res;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    await db
      .insert(aiMessages)
      .values({
        userId: args.userId,
        kind: "freeform",
        prompt: { input },
        response: (raw as object | null) ?? null,
        model: TRANSCRIBE_ENDPOINT,
        costCents: null,
        errorMsg,
      })
      .catch(() => {});
  }

  const text = (raw as { text?: string } | null)?.text ?? "";
  return { text, raw };
}
