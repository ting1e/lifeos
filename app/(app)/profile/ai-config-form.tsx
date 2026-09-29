"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";
import type { AiTask } from "@/lib/ai/tasks";

const TASK_LABEL: Record<AiTask, DictKey> = {
  meal_parse: "prof.aiTaskMealParse",
  food_vision: "prof.aiTaskFoodVision",
  audio_meal_parse: "prof.aiTaskAudioMealParse",
  weekly_insights: "prof.aiTaskWeeklyInsights",
  meal_plan: "prof.aiTaskMealPlan",
  workout_plan: "prof.aiTaskWorkoutPlan",
  nutrition_lookup: "prof.aiTaskNutritionLookup",
};

type ProviderRow = {
  /** stable client-side key; survives across saved/unsaved rows */
  localId: string;
  /** server id — null while the row is an unsaved draft */
  id: string | null;
  name: string;
  baseUrl: string;
  /** newly typed key — empty means keep the stored one */
  apiKey: string;
  apiKeyMasked: string;
  hasKey: boolean;
  enabled: boolean;
  /** saved model selection */
  models: string[];
  /** last fetched catalog (display only) */
  fetched: string[];
};

type SavedProvider = ProviderRow & { id: string };

type TaskRow = {
  task: AiTask;
  providerId: string;
  modelId: string;
  reasoningEffort: string;
  maxTokens: string;
  defaultMaxTokens: number;
};

type ProviderDto = {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  enabled: boolean;
  apiKeyMasked: string;
  hasKey: boolean;
};

type TasksDto = {
  tasks: {
    task: AiTask;
    providerId: string | null;
    modelId: string;
    reasoningEffort: string;
    maxTokens: number | null;
    defaults: { maxTokens: number };
  }[];
};

let draftSeq = 0;

function draftProvider(): ProviderRow {
  draftSeq += 1;
  return {
    localId: `draft-${draftSeq}`,
    id: null,
    name: "",
    baseUrl: "",
    apiKey: "",
    apiKeyMasked: "",
    hasKey: false,
    enabled: true,
    models: [],
    fetched: [],
  };
}

function toProviderRow(p: ProviderDto): ProviderRow {
  return {
    localId: p.id,
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    apiKey: "",
    apiKeyMasked: p.apiKeyMasked,
    hasKey: p.hasKey,
    enabled: p.enabled,
    models: p.models,
    fetched: [],
  };
}

const REASONING_OPTIONS = ["", "low", "medium", "high", "max"] as const;

export function AiConfigForm() {
  const t = useT();
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [savingTasks, setSavingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const [pr, tr] = await Promise.all([
      fetch("/api/ai/providers").then((r) => r.json()),
      fetch("/api/ai/tasks").then((r) => r.json()),
    ]);
    setProviders((pr.providers as ProviderDto[]).map(toProviderRow));
    const dto = tr as TasksDto;
    setTasks(
      dto.tasks.map((c) => ({
        task: c.task,
        providerId: c.providerId ?? "",
        modelId: c.modelId,
        reasoningEffort: c.reasoningEffort,
        maxTokens: c.maxTokens != null ? String(c.maxTokens) : "",
        defaultMaxTokens: c.defaults.maxTokens,
      })),
    );
  }, []);

  useEffect(() => {
    refetch()
      .catch(() => setError(t("prof.aiSaveError")))
      .finally(() => setLoading(false));
  }, [refetch, t]);

  function updateProvider(localId: string, patch: Partial<ProviderRow>) {
    setProviders((rows) => rows.map((p) => (p.localId === localId ? { ...p, ...patch } : p)));
  }

  function updateTask(task: AiTask, patch: Partial<TaskRow>) {
    setTasks((rows) => rows.map((r) => (r.task === task ? { ...r, ...patch } : r)));
  }

  /** Create or update the provider row from the current form state. */
  async function persistProvider(p: ProviderRow): Promise<string | null> {
    if (!p.name.trim() || !p.baseUrl.trim()) {
      setError(t("prof.aiProviderIncomplete"));
      return null;
    }
    const body: Record<string, unknown> = {
      name: p.name.trim(),
      baseUrl: p.baseUrl.trim(),
      enabled: p.enabled,
    };
    if (p.apiKey.trim()) body.apiKey = p.apiKey.trim();
    const r = await fetch(p.id ? `/api/ai/providers/${p.id}` : "/api/ai/providers", {
      method: p.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      setError(t("prof.aiSaveError"));
      return null;
    }
    if (!p.id) {
      const json = await r.json();
      return json.id as string;
    }
    return p.id;
  }

  async function saveProvider(p: ProviderRow) {
    setBusyProvider(p.localId);
    setError(null);
    try {
      await persistProvider(p);
      await refetch();
    } finally {
      setBusyProvider(null);
    }
  }

  async function fetchModels(p: ProviderRow) {
    setBusyProvider(p.localId);
    setError(null);
    try {
      // Fetching uses the stored credentials — persist the row first.
      const id = await persistProvider(p);
      if (!id) return;
      await refetch();
      const r = await fetch(`/api/ai/providers/${id}/models`, { method: "POST" });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.detail || json?.error);
      setProviders((rows) =>
        rows.map((row) => (row.id === id ? { ...row, fetched: json.models as string[] } : row)),
      );
    } catch {
      setError(t("prof.aiFetchError"));
    } finally {
      setBusyProvider(null);
    }
  }

  async function toggleModel(p: SavedProvider, model: string, checked: boolean) {
    const models = checked
      ? [...new Set([...p.models, model])]
      : p.models.filter((m) => m !== model);
    updateProvider(p.localId, { models });
    await fetch(`/api/ai/providers/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ models }),
    }).catch(() => setError(t("prof.aiSaveError")));
  }

  async function deleteProvider(p: ProviderRow) {
    if (p.id) {
      const ok = await confirm({
        message: t("prof.aiDeleteProviderConfirm"),
        danger: true,
      });
      if (!ok) return;
      await fetch(`/api/ai/providers/${p.id}`, { method: "DELETE" }).catch(() => {});
    }
    setProviders((rows) => rows.filter((r) => r.localId !== p.localId));
    if (p.id) await refetch();
  }

  async function saveTasks(e: React.FormEvent) {
    e.preventDefault();
    setSavingTasks(true);
    setError(null);
    try {
      const requests = tasks.map((r) => {
        if (!r.providerId) {
          // No provider selected — clear the config, task falls back to defaults.
          return fetch("/api/ai/tasks", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ task: r.task, providerId: null, modelId: "" }),
          });
        }
        if (!r.modelId) return null; // incomplete row — leave unchanged
        return fetch("/api/ai/tasks", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            task: r.task,
            providerId: r.providerId,
            modelId: r.modelId,
            reasoningEffort: r.reasoningEffort || null,
            maxTokens: r.maxTokens ? parseInt(r.maxTokens, 10) || null : null,
          }),
        });
      });
      const results = await Promise.all(requests.filter((r): r is Promise<Response> => r !== null));
      if (results.some((r) => !r.ok)) throw new Error();
      router.refresh();
    } catch {
      setError(t("prof.aiSaveError"));
    } finally {
      setSavingTasks(false);
    }
  }

  if (loading) {
    return (
      <div className="font-mono text-[13px] text-[color:var(--text-disabled)] mt-4">
        …
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-4">
      {/* ---------------- providers ---------------- */}
      <section className="space-y-4">
        <div className="mono-label">{t("prof.aiProvidersSection")}</div>
        {providers.map((p) => {
          const candidates = [...new Set([...p.models, ...p.fetched])].sort((a, b) =>
            a.localeCompare(b),
          );
          const busy = busyProvider === p.localId;
          const saved = p.id !== null;
          return (
            <div
              key={p.localId}
              className="border border-[color:var(--border-visible)] p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="mono-label">
                  {p.name.trim() || t("prof.aiNewProvider")}
                </div>
                <label className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-[color:var(--accent)]"
                    checked={p.enabled}
                    onChange={(e) => updateProvider(p.localId, { enabled: e.target.checked })}
                  />
                  {t("prof.aiEnabled")}
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mono-label mb-1">{t("prof.aiProviderName")}</div>
                  <Input
                    type="text"
                    value={p.name}
                    placeholder="Fork API"
                    onChange={(e) => updateProvider(p.localId, { name: e.target.value })}
                  />
                </div>
                <div>
                  <div className="mono-label mb-1">{t("prof.aiBaseUrl")}</div>
                  <Input
                    type="url"
                    value={p.baseUrl}
                    placeholder="https://api.openai.com/v1"
                    onChange={(e) => updateProvider(p.localId, { baseUrl: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <div className="mono-label mb-1">{t("prof.aiApiKey")}</div>
                  <Input
                    type="text"
                    value={p.apiKey}
                    placeholder={p.hasKey ? p.apiKeyMasked : ""}
                    onChange={(e) => updateProvider(p.localId, { apiKey: e.target.value })}
                  />
                  {p.hasKey && (
                    <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
                      {t("prof.aiApiKeyKeep")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyProvider !== null}
                  onClick={() => fetchModels(p)}
                >
                  {busy && p.fetched.length === 0 && !saved
                    ? t("common.busy")
                    : t("prof.aiFetchModels")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyProvider !== null}
                  onClick={() => saveProvider(p)}
                >
                  {busy ? t("common.busy") : t("prof.save")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyProvider !== null}
                  onClick={() => deleteProvider(p)}
                >
                  {t("prof.aiDeleteProvider")}
                </Button>
              </div>
              <div className="space-y-1">
                {candidates.length === 0 ? (
                  <div className="font-mono text-[12px] text-[color:var(--text-disabled)]">
                    {t("prof.aiNoModels")}
                  </div>
                ) : (
                  candidates.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-2 font-mono text-[13px] text-[color:var(--text-display)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="accent-[color:var(--accent)]"
                        checked={p.models.includes(m)}
                        disabled={!saved}
                        onChange={(e) =>
                          saved && toggleModel(p as SavedProvider, m, e.target.checked)
                        }
                      />
                      {m}
                    </label>
                  ))
                )}
              </div>
            </div>
          );
        })}
        <div>
          <Button
            variant="outline"
            size="sm"
            disabled={providers.some((p) => p.id === null)}
            onClick={() => setProviders((rows) => [...rows, draftProvider()])}
          >
            {t("prof.aiAddProvider")}
          </Button>
        </div>
      </section>

      {/* ---------------- tasks ---------------- */}
      <form onSubmit={saveTasks} className="space-y-4">
        <section className="space-y-4">
          <div className="mono-label">{t("prof.aiTasksSection")}</div>
          <div className="border border-[color:var(--border-visible)] p-4 space-y-4">
            <div className="hidden md:grid md:grid-cols-[1.3fr_1fr_1.2fr_0.7fr_0.8fr] gap-4">
              <div className="mono-label">{t("prof.aiTaskColumn")}</div>
              <div className="mono-label">{t("prof.aiProvider")}</div>
              <div className="mono-label">{t("prof.aiModel")}</div>
              <div className="mono-label">{t("prof.aiReasoning")}</div>
              <div className="mono-label">{t("prof.aiMaxTokens")}</div>
            </div>
            {tasks.map((r) => {
              const provider = providers.find((p) => p.id === r.providerId);
              const modelOptions = [
                ...new Set([...(provider?.models ?? []), r.modelId].filter(Boolean)),
              ];
              const cellLabel = "mono-label mb-1 md:hidden";
              return (
                <div
                  key={r.task}
                  className="grid grid-cols-2 gap-4 md:grid-cols-[1.3fr_1fr_1.2fr_0.7fr_0.8fr] md:items-center"
                >
                  <div className="col-span-2 md:col-span-1">
                    <div className="mono-label">{t(TASK_LABEL[r.task])}</div>
                  </div>
                  <div>
                    <div className={cellLabel}>{t("prof.aiProvider")}</div>
                    <Select
                      className="py-2 text-base"
                      value={r.providerId}
                      onChange={(e) =>
                        updateTask(r.task, { providerId: e.target.value, modelId: "" })
                      }
                    >
                      <option value="">{t("prof.aiNoProvider")}</option>
                      {providers
                        .filter((p): p is SavedProvider => p.id !== null && p.enabled)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                  <div>
                    <div className={cellLabel}>{t("prof.aiModel")}</div>
                    <Select
                      className="py-2 text-base"
                      value={r.modelId}
                      disabled={!r.providerId}
                      onChange={(e) => updateTask(r.task, { modelId: e.target.value })}
                    >
                      <option value="">{t("prof.aiSelectModel")}</option>
                      {modelOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <div className={cellLabel}>{t("prof.aiReasoning")}</div>
                    <Select
                      className="py-2 text-base"
                      value={r.reasoningEffort}
                      disabled={!r.providerId}
                      onChange={(e) => updateTask(r.task, { reasoningEffort: e.target.value })}
                    >
                      {REASONING_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o === "" ? t("prof.aiReasoningAuto") : o}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <div className={cellLabel}>{t("prof.aiMaxTokens")}</div>
                    <Input
                      className="py-2 text-base"
                      type="number"
                      min={1}
                      value={r.maxTokens}
                      placeholder={String(r.defaultMaxTokens)}
                      disabled={!r.providerId}
                      onChange={(e) => updateTask(r.task, { maxTokens: e.target.value })}
                    />
                  </div>
                </div>
              );
            })}
            <div className="font-mono text-[12px] text-[color:var(--text-disabled)]">
              {t("prof.aiTaskFallbackHint")}
            </div>
          </div>
        </section>
        {error && (
          <div className="font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--accent)]">
            → {error}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={savingTasks}>
            {savingTasks ? t("common.busy") : t("prof.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
