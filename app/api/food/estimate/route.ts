import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { visionJson } from "@/lib/ai/client";
import { foodVisionPrompt } from "@/lib/ai/prompts";
import { FoodVisionSchema } from "@/lib/ai/schemas";
import { uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1), // file name from /api/food/upload
});

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const safeName = path.basename(parsed.data.name);
  const full = uploadPath(safeName);

  try {
    const buf = await fs.readFile(full);
    const ext = (safeName.split(".").pop() ?? "jpg").toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? "image/jpeg";
    const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
    const { system, prompt } = foodVisionPrompt(user.locale);
    const out = await visionJson({
      userId: user.id,
      kind: "food_vision",
      system,
      prompt,
      imageUrls: [dataUri],
      sourcePath: safeName,
      schema: FoodVisionSchema,
      temperature: 0.2,
    });
    return NextResponse.json({ estimate: out });
  } catch (e) {
    console.error("[food/estimate]", e);
    return NextResponse.json(
      { error: "estimate_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
