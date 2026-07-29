import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { chatJson, visionJson } from "@/lib/ai/client";
import { mealParserPrompt, foodVisionParsePrompt } from "@/lib/ai/prompts";
import { MealLogSchema } from "@/lib/ai/schemas";
import { uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";
// Web-search-augmented calls take longer than a typical chat — give them more
// headroom than the default vercel function timeout.
export const maxDuration = 60;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

const Body = z.object({
  text: z.string().max(2000).optional(),
  photoPath: z.string().max(200).optional(),
  defaultMeal: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  existing: z
    .object({
      name: z.string(),
      kcal: z.number().nullable().optional(),
      protein_g: z.number().nullable().optional(),
      carbs_g: z.number().nullable().optional(),
      fat_g: z.number().nullable().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { text, photoPath, defaultMeal } = parsed.data;
  const hasText = text && text.trim().length >= 2;
  if (!photoPath && !hasText) {
    return NextResponse.json(
      { error: "invalid_input", detail: "text or photoPath is required" },
      { status: 400 },
    );
  }

  // --- Photo path: vision mode ---
  if (photoPath) {
    try {
      const safeName = path.basename(photoPath);
      const full = uploadPath(safeName);
      const buf = await fs.readFile(full);
      const ext = (safeName.split(".").pop() ?? "jpg").toLowerCase();
      const mime = MIME_BY_EXT[ext] ?? "image/jpeg";
      const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
      const { system, prompt } = foodVisionParsePrompt({
        locale: user.locale,
        text: hasText ? text!.trim() : undefined,
        defaultMeal,
      });
      const out = await visionJson({
        userId: user.id,
        kind: "food_vision",
        system,
        prompt,
        imageUrls: [dataUri],
        sourcePath: safeName,
        schema: MealLogSchema,
        temperature: 0.2,
      });
      return NextResponse.json({ parsed: out });
    } catch (e) {
      console.error("[food/parse-meal] vision", e);
      return NextResponse.json(
        { error: "parse_failed", detail: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }
  }

  // --- Text-only mode (existing behavior) ---
  const { system, prompt } = mealParserPrompt({
    locale: user.locale,
    text: text!.trim(),
    nowIso: new Date().toISOString(),
    defaultMeal,
    existing: parsed.data.existing
      ? {
          name: parsed.data.existing.name,
          kcal: parsed.data.existing.kcal ?? null,
          protein_g: parsed.data.existing.protein_g ?? null,
          carbs_g: parsed.data.existing.carbs_g ?? null,
          fat_g: parsed.data.existing.fat_g ?? null,
        }
      : undefined,
  });

  try {
    const out = await chatJson({
      userId: user.id,
      kind: "food_vision",
      system,
      prompt,
      schema: MealLogSchema,
      temperature: 0.2,
      maxTokens: 2500,
      webSearch: true,
    });
    return NextResponse.json({ parsed: out });
  } catch (e) {
    console.error("[food/parse-meal]", e);
    return NextResponse.json(
      { error: "parse_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
