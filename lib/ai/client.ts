import { db } from "@/lib/db/client";
import { aiMessages } from "@/lib/db/schema";
import { getAiConfig, type AiConfig } from "@/lib/ai/config";

export type AiKind = "food_vision" | "plan" | "insights" | "freeform";

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
   * model needs current portion / brand data. Ignored for non-OpenRouter
   * endpoints.
   */
  webSearch?: boolean;
  /**
   * For reasoning models (e.g. mimo-v2.5). When `false`, sends
   * `thinking:{type:"disabled"}` to skip reasoning tokens — faster, cheaper,
   * but no chain-of-thought. Defaults to `true` (thinking enabled).
   */
  thinking?: boolean;
};

export type VisionArgs = ChatArgs & {
  imageUrls: string[];
  /** File name or path of the source image(s), logged to ai_messages instead of the base64 payload. */
  sourcePath?: string;
};

export type ChatResult = {
  text: string;
  raw: unknown;
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: string } };

type ChatCompletionsResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string } | string;
  usage?: { total_tokens?: number; cost?: number };
};

function resolveModel(config: AiConfig, kind: "text" | "image" | "audio", override: string | undefined, webSearch: boolean | undefined): string {
  const base = override ?? (kind === "image" ? config.imageModel : kind === "audio" ? config.audioModel : config.textModel);
  if (!webSearch || !config.openrouter) return base;
  return base.endsWith(":online") ? base : `${base}:online`;
}

async function chatCompletions(args: {
  userId: string;
  kind: AiKind;
  config: AiConfig;
  modelKind: "text" | "image" | "audio";
  system?: string;
  content: ContentPart[];
  sourcePath?: string;
  temperature?: number;
  maxTokens?: number;
  webSearch?: boolean;
  modelOverride?: string;
  thinking?: boolean;
}): Promise<ChatResult> {
  const { userId, kind, config, modelKind, system, content, sourcePath, temperature, maxTokens, webSearch, modelOverride, thinking } = args;
  const model = resolveModel(config, modelKind, modelOverride, webSearch);

  const messages: { role: string; content: unknown }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content });

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens ?? 2048,
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (thinking === false) body.thinking = { type: "disabled" };

  // Audit-safe log: strip base64 payloads, keep the source file path instead.
  const logContent = content.map((c) => {
    if (c.type === "text") return c;
    if (c.type === "image_url")
      return { type: "image_url" as const, source: sourcePath ?? `[omitted ${c.image_url.url.length} chars]` };
    return {
      type: "input_audio" as const,
      source: sourcePath ?? `[omitted ${c.input_audio.data.length} chars]`,
      format: c.input_audio.format,
    };
  });

  let raw: ChatCompletionsResponse | null = null;
  let errorMsg: string | null = null;
  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
        "api-key": config.apiKey,
      },
      body: JSON.stringify(body),
    });
    raw = (await res.json().catch(() => null)) as ChatCompletionsResponse | null;
    if (!res.ok || raw?.error) {
      const m = raw?.error
        ? typeof raw.error === "string"
          ? raw.error
          : raw.error.message ?? JSON.stringify(raw.error)
        : `HTTP ${res.status}`;
      throw new Error(m);
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    await db
      .insert(aiMessages)
      .values({
        userId,
        kind,
        prompt: { model, system, content: logContent },
        response: (raw as object | null) ?? null,
        model,
        costCents: null,
        errorMsg,
      })
      .catch(() => {});
  }

  const text = raw?.choices?.[0]?.message?.content ?? "";
  return { text, raw };
}

export async function chat(args: ChatArgs): Promise<ChatResult> {
  const config = await getAiConfig(args.userId);
  return chatCompletions({
    userId: args.userId,
    kind: args.kind,
    config,
    modelKind: "text",
    system: args.system,
    content: [{ type: "text", text: args.prompt }],
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    webSearch: args.webSearch,
    modelOverride: args.model,
    thinking: args.thinking,
  });
}

export async function vision(args: VisionArgs): Promise<ChatResult> {
  const config = await getAiConfig(args.userId);
  const content: ContentPart[] = [
    ...args.imageUrls.map((url) => ({ type: "image_url", image_url: { url } } as ContentPart)),
    { type: "text", text: args.prompt },
  ];
  return chatCompletions({
    userId: args.userId,
    kind: args.kind,
    config,
    modelKind: "image",
    system: args.system,
    content,
    sourcePath: args.sourcePath,
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    webSearch: args.webSearch,
    modelOverride: args.model,
    thinking: args.thinking,
  });
}

export type StreamChunk = { reasoning?: string; content?: string };

async function* chatCompletionsStream(args: {
  userId: string;
  kind: AiKind;
  config: AiConfig;
  modelKind: "text" | "image" | "audio";
  system?: string;
  content: ContentPart[];
  sourcePath?: string;
  temperature?: number;
  maxTokens?: number;
  webSearch?: boolean;
  modelOverride?: string;
  thinking?: boolean;
}): AsyncGenerator<StreamChunk> {
  const { userId, kind, config, modelKind, system, content, sourcePath, temperature, maxTokens, webSearch, modelOverride, thinking } = args;
  const model = resolveModel(config, modelKind, modelOverride, webSearch);

  const messages: { role: string; content: unknown }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content });

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens ?? 2048,
    stream: true,
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (thinking === false) body.thinking = { type: "disabled" };

  const logContent = content.map((c) => {
    if (c.type === "text") return c;
    if (c.type === "image_url")
      return { type: "image_url" as const, source: sourcePath ?? `[omitted ${c.image_url.url.length} chars]` };
    return {
      type: "input_audio" as const,
      source: sourcePath ?? `[omitted ${c.input_audio.data.length} chars]`,
      format: c.input_audio.format,
    };
  });

  let contentText = "";
  let errorMsg: string | null = null;

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
        "api-key": config.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "");
      let m = `HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        m = typeof errJson?.error === "string"
          ? errJson.error
          : errJson?.error?.message ?? m;
      } catch {
        if (errText) m = errText;
      }
      throw new Error(m);
    }

    // Fallback: some endpoints ignore `stream:true` and return a regular
    // JSON response. Detect by content-type and yield the content directly.
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const json = (await res.json()) as ChatCompletionsResponse;
      if (json.error) {
        const m = typeof json.error === "string"
          ? json.error
          : json.error.message ?? "unknown error";
        throw new Error(m);
      }
      const text = json.choices?.[0]?.message?.content ?? "";
      contentText = text;
      yield { content: text };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const choice = json?.choices?.[0];
          const delta = choice?.delta;
          if (delta) {
            const reasoning: string | undefined = delta.reasoning_content;
            const content: string | undefined = delta.content;
            if (reasoning) {
              yield { reasoning };
            }
            if (content) {
              contentText += content;
              yield { content };
            }
          }
        } catch {
          // partial chunk — will be completed on next read
        }
      }
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    await db
      .insert(aiMessages)
      .values({
        userId,
        kind,
        prompt: { model, system, content: logContent },
        response: { text: contentText },
        model,
        costCents: null,
        errorMsg,
      })
      .catch(() => {});
  }
}

export async function* chatStream(args: ChatArgs): AsyncGenerator<StreamChunk> {
  const config = await getAiConfig(args.userId);
  yield* chatCompletionsStream({
    userId: args.userId,
    kind: args.kind,
    config,
    modelKind: "text",
    system: args.system,
    content: [{ type: "text", text: args.prompt }],
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    webSearch: args.webSearch,
    modelOverride: args.model,
    thinking: args.thinking,
  });
}

export async function* visionStream(args: VisionArgs): AsyncGenerator<StreamChunk> {
  const config = await getAiConfig(args.userId);
  const content: ContentPart[] = [
    ...args.imageUrls.map((url) => ({ type: "image_url", image_url: { url } } as ContentPart)),
    { type: "text", text: args.prompt },
  ];
  yield* chatCompletionsStream({
    userId: args.userId,
    kind: args.kind,
    config,
    modelKind: "image",
    system: args.system,
    content,
    sourcePath: args.sourcePath,
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    webSearch: args.webSearch,
    modelOverride: args.model,
    thinking: args.thinking,
  });
}

function audioFormat(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("webm")) return "webm";
  if (ct.includes("ogg")) return "ogg";
  if (ct.includes("wav")) return "wav";
  if (ct.includes("mp4") || ct.includes("m4a")) return "mp4";
  if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
  if (ct.includes("flac")) return "flac";
  if (ct.includes("aac")) return "aac";
  return "wav";
}

export type TranscribeArgs = {
  userId: string;
  audioBuffer: Buffer | Uint8Array;
  contentType: string;
  /** File name or path of the source audio, logged to ai_messages instead of the base64 payload. */
  sourcePath?: string;
};

export async function transcribeAudio(args: TranscribeArgs): Promise<{ text: string; raw: unknown }> {
  const config = await getAiConfig(args.userId);
  const format = audioFormat(args.contentType);
  const base64 = Buffer.from(args.audioBuffer).toString("base64");
  const content: ContentPart[] = [
    { type: "input_audio", input_audio: { data: base64, format } },
    { type: "text", text: "Transcribe the spoken content of this audio. Return only the transcript text, nothing else." },
  ];
  const { text, raw } = await chatCompletions({
    userId: args.userId,
    kind: "freeform",
    config,
    modelKind: "audio",
    content,
    sourcePath: args.sourcePath,
    temperature: 0,
    maxTokens: 1024,
  });
  return { text, raw };
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

export async function chatJsonStream<T>(
  args: ChatArgs & {
    schema: import("zod").ZodSchema<T>;
    onChunk?: (chunk: StreamChunk, contentFull: string) => void;
  },
): Promise<T> {
  const { schema, onChunk, ...rest } = args;
  let contentFull = "";
  for await (const chunk of chatStream(rest)) {
    if (chunk.content) contentFull += chunk.content;
    onChunk?.(chunk, contentFull);
  }
  const parsed = tryParse(contentFull);
  if (parsed) {
    const validated = schema.safeParse(parsed);
    if (validated.success) return validated.data;
  }
  const retry = await chat({
    ...rest,
    prompt: `${rest.prompt}\n\nYour previous response was not valid JSON. Return ONLY a single JSON object matching the schema. No markdown, no prose.\n\nPrevious response:\n${contentFull}`,
  });
  const retryParsed = tryParse(retry.text);
  return schema.parse(retryParsed);
}

export async function visionJsonStream<T>(
  args: VisionArgs & {
    schema: import("zod").ZodSchema<T>;
    onChunk?: (chunk: StreamChunk, contentFull: string) => void;
  },
): Promise<T> {
  const { schema, onChunk, ...rest } = args;
  let contentFull = "";
  for await (const chunk of visionStream(rest)) {
    if (chunk.content) contentFull += chunk.content;
    onChunk?.(chunk, contentFull);
  }
  const parsed = tryParse(contentFull);
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
