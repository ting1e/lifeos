import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { aiProviders } from "@/lib/db/schema";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 30_000;

type RouteParams = { params: Promise<{ id: string }> };

type ModelsResponse = {
  data?: { id?: string }[];
  error?: { message?: string } | string;
};

/**
 * Fetch the model catalog from the provider's OpenAI-compatible
 * `{baseUrl}/models` endpoint. Does not mutate the provider — the client
 * lets the user pick models and saves the selection via PATCH.
 */
export async function POST(_req: Request, { params }: RouteParams) {
  const { user } = await requireSession();
  const { id } = await params;

  const [provider] = await db
    .select()
    .from(aiProviders)
    .where(and(eq(aiProviders.id, id), eq(aiProviders.userId, user.id)))
    .limit(1);
  if (!provider) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!provider.apiKey) {
    return NextResponse.json(
      { error: "no_api_key", detail: "Save an API key first." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${provider.baseUrl.replace(/\/+$/, "")}/models`, {
      headers: {
        authorization: `Bearer ${provider.apiKey}`,
        "api-key": provider.apiKey,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => null)) as ModelsResponse | null;
    if (!res.ok || json?.error) {
      const m = json?.error
        ? typeof json.error === "string"
          ? json.error
          : json.error.message ?? JSON.stringify(json.error)
        : `HTTP ${res.status}`;
      return NextResponse.json({ error: "fetch_failed", detail: m }, { status: 502 });
    }

    const models = Array.from(
      new Set(
        (json?.data ?? [])
          .map((m) => (typeof m?.id === "string" ? m.id.trim() : ""))
          .filter((m) => m.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ models });
  } catch (e) {
    const name = (e as { name?: string })?.name;
    const detail = name === "TimeoutError" || name === "AbortError" ? "timeout" : e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "fetch_failed", detail }, { status: 502 });
  }
}
