import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiProviders, aiTaskConfigs } from "@/lib/db/schema";
import { envModelForTask, type AiTask } from "./tasks";
import type { ProviderRef, ResolvedTaskConfig } from "./types";

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

function providerRef(
  id: string | null,
  name: string,
  baseUrl: string,
  apiKey: string,
): ProviderRef {
  const url = trimTrailingSlash(baseUrl);
  return { id, name, baseUrl: url, apiKey, openrouter: url.includes("openrouter") };
}

function envProvider(): ProviderRef {
  return providerRef(
    null,
    "env",
    process.env.OPENAI_BASE_URL || "",
    process.env.OPENAI_API_KEY || "",
  );
}

/**
 * task -> ai_task_configs -> ai_providers -> connection + model + params.
 *
 * Fallback ladder (keeps pre-refactor inheritance semantics):
 * 1. task config row joined to an enabled provider with a baseUrl;
 * 2. task config row whose provider is unusable — keep the task's model and
 *    params, but fall back to the env connection;
 * 3. no task row — first enabled provider with a baseUrl, env model;
 * 4. nothing configured — env connection + env model.
 *
 * The caller (client.ts) throws `ai_not_configured` when the resolved
 * provider has no baseUrl or apiKey.
 */
export async function resolveTaskConfig(
  userId: string,
  task: AiTask,
): Promise<ResolvedTaskConfig> {
  const envModel = envModelForTask(task);

  const [row] = await db
    .select({
      providerId: aiProviders.id,
      providerName: aiProviders.name,
      baseUrl: aiProviders.baseUrl,
      apiKey: aiProviders.apiKey,
      modelId: aiTaskConfigs.modelId,
      reasoningEffort: aiTaskConfigs.reasoningEffort,
      maxTokens: aiTaskConfigs.maxTokens,
    })
    .from(aiTaskConfigs)
    .innerJoin(aiProviders, eq(aiTaskConfigs.providerId, aiProviders.id))
    .where(
      and(
        eq(aiTaskConfigs.userId, userId),
        eq(aiTaskConfigs.task, task),
        eq(aiProviders.enabled, true),
      ),
    )
    .limit(1);

  const rowParams = {
    modelId: row?.modelId,
    reasoningEffort: (row?.reasoningEffort ?? "").trim(),
    maxTokens: row?.maxTokens ?? null,
  };

  if (row && trimTrailingSlash(row.baseUrl)) {
    return {
      provider: providerRef(row.providerId, row.providerName, row.baseUrl, row.apiKey ?? ""),
      ...rowParams,
    };
  }

  // Task row exists but its provider is missing/disabled/connection-less.
  if (row) {
    return { provider: envProvider(), ...rowParams };
  }

  const candidates = await db
    .select()
    .from(aiProviders)
    .where(and(eq(aiProviders.userId, userId), eq(aiProviders.enabled, true)))
    .orderBy(asc(aiProviders.createdAt))
    .limit(10);
  const fallbackProvider = candidates.find((p) => trimTrailingSlash(p.baseUrl));

  if (fallbackProvider) {
    return {
      provider: providerRef(
        fallbackProvider.id,
        fallbackProvider.name,
        fallbackProvider.baseUrl,
        fallbackProvider.apiKey ?? "",
      ),
      modelId: envModel,
      reasoningEffort: "",
      maxTokens: null,
    };
  }

  return {
    provider: envProvider(),
    modelId: envModel,
    reasoningEffort: "",
    maxTokens: null,
  };
}
