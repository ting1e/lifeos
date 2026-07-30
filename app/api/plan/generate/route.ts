import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  foodEntries,
  foodPreferences,
  mealPlans,
  pantryItems,
  profile,
  shoppingLists,
} from "@/lib/db/schema";
import { chatJsonStream } from "@/lib/ai/client";
import { weeklyPlanPrompt } from "@/lib/ai/prompts";
import { MealPlanSchema } from "@/lib/ai/schemas";
import { createChunkSender, createSSEStream } from "@/lib/ai/sse";
import { bmr, macroSplit, recommendedKcal, tdee } from "@/lib/nutrition";
import { getMeasuredTdee } from "@/lib/whoop/tdee";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({ days: z.number().int().min(1).max(14).default(7) });

export async function POST(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const days = parsed.success ? parsed.data.days : 7;

  const [p] = await db.select().from(profile).where(eq(profile.userId, user.id)).limit(1);
  if (!p?.weightKg || !p?.heightCm || !p?.age) {
    return Response.json({ error: "profile_incomplete" }, { status: 400 });
  }
  const whoopEnabled = p?.whoopEnabled ?? true;
  const w = Number(p.weightKg);
  const h = Number(p.heightCm);
  const formulaTdee = tdee(
    bmr({ sex: p.sex ?? "m", weightKg: w, heightCm: h, age: p.age }),
    p.activityLevel ?? "moderate",
  );
  const measured = whoopEnabled ? await getMeasuredTdee(user.id) : null;
  const td = measured?.kcal ?? formulaTdee;
  const goal = p.goal ?? "maintain";
  const target = Math.round(recommendedKcal(td, goal));
  const { proteinG, carbsG, fatG } = macroSplit(target, w, goal);

  const prefs = await db
    .select()
    .from(foodPreferences)
    .where(eq(foodPreferences.userId, user.id));
  const liked = prefs.filter((x) => x.kind === "liked").map((x) => x.label);
  const disliked = prefs.filter((x) => x.kind === "disliked").map((x) => x.label);
  const allergies = prefs.filter((x) => x.kind === "allergy").map((x) => x.label);

  const pantry = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, user.id));

  const since = new Date(Date.now() - 14 * 86_400_000);
  const recent = await db
    .select()
    .from(foodEntries)
    .where(and(eq(foodEntries.userId, user.id), gte(foodEntries.consumedAt, since)))
    .orderBy(desc(foodEntries.consumedAt))
    .limit(50);

  const { system, prompt } = weeklyPlanPrompt({
    locale: user.locale,
    goal,
    targetKcal: target,
    proteinG,
    carbsG,
    fatG,
    liked,
    disliked,
    allergies,
    pantry: pantry.map((x) => ({
      name: x.name,
      qty: x.qty ? Number(x.qty) : null,
      unit: x.unit,
    })),
    recentMeals: recent.map((x) => x.name),
    daysCount: days,
  });

  return createSSEStream(async (send) => {
    const onChunk = createChunkSender(send);
    const out = await chatJsonStream({
      userId: user.id,
      kind: "plan",
      system,
      prompt,
      schema: MealPlanSchema,
      temperature: 0.5,
      maxTokens: 8192,
      thinking: true,
      onChunk,
    });

    send({ type: "processing" });

    const [plan] = await db
      .insert(mealPlans)
      .values({
        userId: user.id,
        startsOn: out.starts_on,
        endsOn: out.ends_on,
        goalSnapshot: {
          goal,
          targetKcal: target,
          proteinG,
          carbsG,
          fatG,
        },
        plan: out,
      })
      .returning({ id: mealPlans.id });

    await db.insert(shoppingLists).values({
      mealPlanId: plan.id,
      items: out.shopping_list,
    });

    send({ type: "complete", data: { id: plan.id, plan: out } });
  }, "plan/generate");
}
