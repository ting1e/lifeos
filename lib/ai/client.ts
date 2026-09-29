import { db } from "@/lib/db/client";
import { aiMessages } from "@/lib/db/schema";
import { resolveTaskConfig } from "@/lib/ai/resolver";
import { TASK_DEFAULTS, type AiTask } from "@/lib/ai/tasks";
import type { ResolvedTaskConfig } from "@/lib/ai/types";

export type { AiTask } from "@/lib/ai/tasks";

export type ChatArgs = {
  userId: string;
  /** Business task — resolves provider/model/reasoning/tokens via lib/ai/resolver. */
  task: AiTask;
  prompt: string;
  system?: string;
  /** Overrides the task's built-in temperature. */
  temperature?: number;
  /** Overrides the task config, then the task's built-in max_tokens. */
  maxTokens?: number;
  /**
   * Append `:online` to the resolved model id so OpenRouter's web-search
   * variant handles the request. Useful for nutrition lookups where the
   * model needs current portion / brand data. Ignored for non-OpenRouter
   * endpoints. Defaults to the task's built-in webSearch flag.
   */
  webSearch?: boolean;
  /**
   * For reasoning models (e.g. mimo-v2.5). When `false`, sends
   * `thinking:{type:"disabled"}` to skip reasoning tokens — faster, cheaper,
   * but no chain-of-thought. Only applies when no reasoning_effort is
   * configured for the task. Defaults to the task's built-in thinking flag.
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

function resolveModel(config: ResolvedTaskConfig, webSearch: boolean): string {
  const base = config.modelId;
  if (!webSearch || !config.provider.openrouter) return base;
  return base.endsWith(":online") ? base : `${base}:online`;
}

/**
 * Apply the task-configured reasoning effort. OpenAI-style only: the value is
 * sent as `reasoning_effort` verbatim (e.g. low/medium/high). Blank keeps
 * per-task behavior (`thinking:false` call sites still disable reasoning).
 */
function applyReasoning(
  body: Record<string, unknown>,
  reasoning: string,
  thinking: boolean | undefined,
) {
  const r = reasoning.trim();
  if (r) {
    body.reasoning_effort = r;
  } else if (thinking === false) {
    body.thinking = { type: "disabled" };
  }
}

// Upstream (AI provider) fetch guards. Without these a hung provider call
// blocks the request forever until the browser/proxy kills the connection
// (surfacing as a raw network error to the user, with no audit row written).
const UPSTREAM_IDLE_TIMEOUT_MS = 120_000; // no bytes for 2 min -> abort
const UPSTREAM_TOTAL_TIMEOUT_MS = 600_000; // hard cap: 10 min

/** Map AbortError/TimeoutError to the ai_timeout error code. */
function normalizeUpstreamError(err: unknown): Error {
  const name = (err as { name?: string })?.name;
  if (name === "AbortError" || name === "TimeoutError") return new Error("ai_timeout");
  return err instanceof Error ? err : new Error(String(err));
}

function requireConnection(config: ResolvedTaskConfig): void {
  if (!config.provider.baseUrl || !config.provider.apiKey) {
    throw new Error("ai_not_configured");
  }
}

function buildBody(args: {
  config: ResolvedTaskConfig;
  task: AiTask;
  system?: string;
  content: ContentPart[];
  temperature?: number;
  maxTokens?: number;
  webSearch?: boolean;
  thinking?: boolean;
  stream: boolean;
}) {
  const { config, task, system, content, temperature, maxTokens, webSearch, thinking, stream } = args;
  const defaults = TASK_DEFAULTS[task];

  const messages: { role: string; content: unknown }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content });

  const body: Record<string, unknown> = {
    model: resolveModel(config, webSearch ?? defaults.webSearch ?? false),
    messages,
    max_tokens: config.maxTokens ?? maxTokens ?? defaults.maxTokens,
  };
  if (stream) body.stream = true;
  const t = temperature ?? defaults.temperature;
  if (t !== undefined) body.temperature = t;
  applyReasoning(body, config.reasoningEffort, thinking ?? defaults.thinking);
  return { body, model: body.model as string };
}

/** Audit-safe log: strip base64 payloads, keep the source file path instead. */
function loggableContent(content: ContentPart[], sourcePath?: string) {
  return content.map((c) => {
    if (c.type === "text") return c;
    if (c.type === "image_url")
      return { type: "image_url" as const, source: sourcePath ?? `[omitted ${c.image_url.url.length} chars]` };
    return {
      type: "input_audio" as const,
      source: sourcePath ?? `[omitted ${c.input_audio.data.length} chars]`,
      format: c.input_audio.format,
    };
  });
}

async function chatCompletions(args: {
  userId: string;
  task: AiTask;
  config: ResolvedTaskConfig;
  system?: string;
  content: ContentPart[];
  sourcePath?: string;
  temperature?: number;
  maxTokens?: number;
  webSearch?: boolean;
  thinking?: boolean;
}): Promise<ChatResult> {
  const { userId, task, config, system, content, sourcePath, temperature, maxTokens, webSearch, thinking } = args;
  requireConnection(config);
  const { body, model } = buildBody({ config, task, system, content, temperature, maxTokens, webSearch, thinking, stream: false });

  const logContent = loggableContent(content, sourcePath);

  let raw: ChatCompletionsResponse | null = null;
  let errorMsg: string | null = null;
  try {
    const res = await fetch(`${config.provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.provider.apiKey}`,
        "api-key": config.provider.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TOTAL_TIMEOUT_MS),
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
    const e = normalizeUpstreamError(err);
    errorMsg = e.message;
    throw e;
  } finally {
    await db
      .insert(aiMessages)
      .values({
        userId,
        kind: task,
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
  const config = await resolveTaskConfig(args.userId, args.task);
  return chatCompletions({
    userId: args.userId,
    task: args.task,
    config,
    system: args.system,
    content: [{ type: "text", text: args.prompt }],
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    webSearch: args.webSearch,
    thinking: args.thinking,
  });
}

export async function vision(args: VisionArgs): Promise<ChatResult> {
  const config = await resolveTaskConfig(args.userId, args.task);
  const content: ContentPart[] = [
    ...args.imageUrls.map((url) => ({ type: "image_url", image_url: { url } } as ContentPart)),
    { type: "text", text: args.prompt },
  ];
  return chatCompletions({
    userId: args.userId,
    task: args.task,
    config,
    system: args.system,
    content,
    sourcePath: args.sourcePath,
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    webSearch: args.webSearch,
    thinking: args.thinking,
  });
}

export type StreamChunk = { reasoning?: string; content?: string };

async function* chatCompletionsStream(args: {
  userId: string;
  task: AiTask;
  config: ResolvedTaskConfig;
  system?: string;
  content: ContentPart[];
  sourcePath?: string;
  temperature?: number;
  maxTokens?: number;
  webSearch?: boolean;
  thinking?: boolean;
}): AsyncGenerator<StreamChunk> {
  const { userId, task, config, system, content, sourcePath, temperature, maxTokens, webSearch, thinking } = args;
  requireConnection(config);
  const { body, model } = buildBody({ config, task, system, content, temperature, maxTokens, webSearch, thinking, stream: true });

  const logContent = loggableContent(content, sourcePath);

  const ac = new AbortController();
  let timedOut = false;
  const onTimeout = () => {
    timedOut = true;
    ac.abort();
  };
  // Abort when no bytes arrive for 2 min (connect, first token, or between
  // chunks) or when the 10 min hard cap is hit.
  let idleTimer: ReturnType<typeof setTimeout> | null = setTimeout(
    onTimeout,
    UPSTREAM_IDLE_TIMEOUT_MS,
  );
  const totalTimer = setTimeout(onTimeout, UPSTREAM_TOTAL_TIMEOUT_MS);
  const resetIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(onTimeout, UPSTREAM_IDLE_TIMEOUT_MS);
  };
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let contentText = "";
  let errorMsg: string | null = null;

  try {
    const res = await fetch(`${config.provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.provider.apiKey}`,
        "api-key": config.provider.apiKey,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
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

    // Headers received — re-arm the idle watchdog for the body phase
    // (covers the JSON fallback below and the first streamed token).
    resetIdle();

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

    reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      resetIdle();
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
    const name = (err as Error)?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      errorMsg = timedOut ? "ai_timeout" : "aborted";
      throw new Error(errorMsg);
    }
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
    clearTimeout(totalTimer);
    reader?.cancel().catch(() => {});
    ac.abort();
    await db
      .insert(aiMessages)
      .values({
        userId,
        kind: task,
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
  const config = await resolveTaskConfig(args.userId, args.task);
  yield* chatCompletionsStream({
    userId: args.userId,
    task: args.task,
    config,
    system: args.system,
    content: [{ type: "text", text: args.prompt }],
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    webSearch: args.webSearch,
    thinking: args.thinking,
  });
}

export async function* visionStream(args: VisionArgs): AsyncGenerator<StreamChunk> {
  const config = await resolveTaskConfig(args.userId, args.task);
  const content: ContentPart[] = [
    ...args.imageUrls.map((url) => ({ type: "image_url", image_url: { url } } as ContentPart)),
    { type: "text", text: args.prompt },
  ];
  yield* chatCompletionsStream({
    userId: args.userId,
    task: args.task,
    config,
    system: args.system,
    content,
    sourcePath: args.sourcePath,
    temperature: args.temperature,
    maxTokens: args.maxTokens,
    webSearch: args.webSearch,
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
  const config = await resolveTaskConfig(args.userId, "audio_meal_parse");
  const format = audioFormat(args.contentType);
  const base64 = Buffer.from(args.audioBuffer).toString("base64");
  const content: ContentPart[] = [
    { type: "input_audio", input_audio: { data: base64, format } },
  ];
  const { text, raw } = await chatCompletions({
    userId: args.userId,
    task: "audio_meal_parse",
    config,
    content,
    sourcePath: args.sourcePath,
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
