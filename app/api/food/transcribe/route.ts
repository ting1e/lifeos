import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { transcribeAudio } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB upload limit
const MAX_BASE64 = 10 * 1024 * 1024; // 10 MB base64 model limit
const ALLOWED = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
]);

export async function POST(req: Request) {
  const { user } = await requireSession();
  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty_audio" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const type = file.type || "audio/webm";
  if (![...ALLOWED].some((t) => type.startsWith(t.split("/")[0]) && (ALLOWED.has(type) || ALLOWED.has(t)))) {
    // Be forgiving: the browser sometimes labels the same blob differently.
    // We only reject obviously non-audio mime types.
    if (!type.startsWith("audio/")) {
      return NextResponse.json({ error: "unsupported_format", detail: type }, { status: 415 });
    }
  }

  // Let the model auto-detect the spoken language — users may dictate in Turkish
  // or English even though the UI is English.

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    if (4 * Math.ceil(buf.length / 3) > MAX_BASE64) {
      return NextResponse.json({ error: "base64_too_large" }, { status: 413 });
    }
    const { text } = await transcribeAudio({
      userId: user.id,
      audioBuffer: buf,
      contentType: type,
    });
    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    console.error("[food/transcribe]", e);
    return NextResponse.json(
      { error: "transcribe_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
