export type SSEEvent =
  | { type: "chunk"; text: string; reasoning?: boolean }
  | { type: "processing" }
  | { type: "complete"; data: unknown }
  | { type: "error"; message: string };

export function sseEncode(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

/** Wraps a route handler in the SSE ReadableStream + Response boilerplate. */
export function createSSEStream(
  handler: (send: (event: SSEEvent) => void) => Promise<void>,
  logTag?: string,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(sseEncode(event)));
      };
      try {
        await handler(send);
      } catch (e) {
        if (logTag) console.error(`[${logTag}]`, e);
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return sseResponse(stream);
}

/** Converts a {reasoning?,content?} chunk into an SSE chunk event. */
export function createChunkSender(send: (event: SSEEvent) => void) {
  return (chunk: { content?: string; reasoning?: string }) => {
    const text = chunk.content ?? chunk.reasoning ?? "";
    if (text) send({ type: "chunk", text, reasoning: !!chunk.reasoning });
  };
}

export type SSEHandlers = {
  onChunk?: (text: string, fullText: string, reasoning: boolean) => void;
  onProcessing?: () => void;
};

export async function readAiStream(
  res: Response,
  handlers: SSEHandlers = {},
): Promise<unknown> {
  if (!res.body) throw new Error("no_stream_body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let completeData: unknown = null;
  let errorMessage: string | null = null;

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
      if (!data) continue;
      try {
        const event = JSON.parse(data) as SSEEvent;
        switch (event.type) {
          case "chunk":
            if (!event.reasoning) fullText += event.text;
            handlers.onChunk?.(event.text, fullText, event.reasoning ?? false);
            break;
          case "processing":
            handlers.onProcessing?.();
            break;
          case "complete":
            completeData = event.data;
            break;
          case "error":
            errorMessage = event.message;
            break;
        }
      } catch {
        // ignore partial/unparseable
      }
    }
  }

  if (errorMessage) throw new Error(errorMessage);
  if (completeData === null) throw new Error("stream_closed_without_complete");
  return completeData;
}
