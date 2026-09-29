import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { aiProviders, aiTaskConfigs } from "@/lib/db/schema";
import { AI_TASKS, TASK_DEFAULTS } from "@/lib/ai/tasks";

export const runtime = "nodejs";

const Body = z.object({
  task: z.enum(AI_TASKS),
  /** null clears the config — the task falls back to provider/env defaults. */
  providerId: z.string().uuid().nullable(),
  modelId: z.string().trim().max(200).default(""),
  reasoningEffort: z.string().trim().max(50).nullable().optional(),
  maxTokens: z.number().int().positive().max(1_000_000).nullable().optional(),
});

export async function GET() {
  const { user } = await requireSession();

  const [configs, providers] = await Promise.all([
    db
      .select({
        task: aiTaskConfigs.task,
        providerId: aiTaskConfigs.providerId,
        modelId: aiTaskConfigs.modelId,
        reasoningEffort: aiTaskConfigs.reasoningEffort,
        maxTokens: aiTaskConfigs.maxTokens,
      })
      .from(aiTaskConfigs)
      .where(eq(aiTaskConfigs.userId, user.id)),
    db
      .select({ id: aiProviders.id, name: aiProviders.name, enabled: aiProviders.enabled })
      .from(aiProviders)
      .where(eq(aiProviders.userId, user.id))
      .orderBy(asc(aiProviders.createdAt)),
  ]);

  const byTask = new Map(configs.map((c) => [c.task, c]));

  return NextResponse.json({
    providers,
    tasks: AI_TASKS.map((task) => {
      const c = byTask.get(task);
      return {
        task,
        providerId: c?.providerId ?? null,
        modelId: c?.modelId ?? "",
        reasoningEffort: c?.reasoningEffort ?? "",
        maxTokens: c?.maxTokens ?? null,
        defaults: TASK_DEFAULTS[task],
      };
    }),
  });
}

export async function PATCH(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const v = parsed.data;
  const task = v.task;

  if (v.providerId !== null && !v.modelId) {
    return NextResponse.json({ error: "invalid_input", detail: "modelId required" }, { status: 400 });
  }

  // Clearing a task config removes the row entirely.
  if (v.providerId === null) {
    await db
      .delete(aiTaskConfigs)
      .where(and(eq(aiTaskConfigs.userId, user.id), eq(aiTaskConfigs.task, task)));
    return NextResponse.json({ ok: true });
  }

  // The provider must belong to this user.
  const [provider] = await db
    .select({ id: aiProviders.id })
    .from(aiProviders)
    .where(and(eq(aiProviders.id, v.providerId), eq(aiProviders.userId, user.id)))
    .limit(1);
  if (!provider) {
    return NextResponse.json({ error: "invalid_input", detail: "unknown provider" }, { status: 400 });
  }

  const values = {
    userId: user.id,
    task,
    providerId: provider.id,
    modelId: v.modelId,
    reasoningEffort: v.reasoningEffort?.trim() || null,
    maxTokens: v.maxTokens ?? null,
  };
  await db
    .insert(aiTaskConfigs)
    .values(values)
    .onConflictDoUpdate({
      target: [aiTaskConfigs.userId, aiTaskConfigs.task],
      set: {
        providerId: values.providerId,
        modelId: values.modelId,
        reasoningEffort: values.reasoningEffort,
        maxTokens: values.maxTokens,
      },
    });

  return NextResponse.json({ ok: true });
}
