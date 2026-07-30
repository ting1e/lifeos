"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { isAiError } from "@/lib/ai/ai-error";
import { readAiStream } from "@/lib/ai/sse";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function GeneratePlanForm() {
  const router = useRouter();
  const t = useT();
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [content, setContent] = useState("");
  const [phase, setPhase] = useState<string | null>(null);

  async function gen() {
    setBusy(true);
    setError(null);
    setReasoning("");
    setContent("");
    setPhase(t("plan.generatingForm"));
    try {
      const r = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: Number(days) }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `http_${r.status}`);
      }
      await readAiStream(r, {
        onChunk: (text, _full, reasoning) => {
          if (reasoning) {
            setReasoning((p) => p + text);
            setPhase(t("plan.aiThinking"));
          } else {
            setContent((p) => p + text);
            setPhase(t("plan.generatingForm"));
          }
        },
        onProcessing: () => setPhase(t("plan.saving")),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-end gap-3">
        <div>
          <div className="mono-label mb-1">{t("plan.genDays")}</div>
          <Select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="3">{t("plan.gen3Days")}</option>
            <option value="7">{t("plan.gen7Days")}</option>
            <option value="14">{t("plan.gen14Days")}</option>
          </Select>
        </div>
        <Button onClick={gen} disabled={busy} variant="accent">
          {busy ? (phase ?? t("plan.generatingForm")) : t("plan.generateForm")}
        </Button>
      </div>
      {error && <div className="font-mono text-[13px] text-[color:var(--accent)]">{error}</div>}
      {error && isAiError(error) && (
        <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">
          {t("common.checkAiConfig")}
        </div>
      )}
      {reasoning && (
        <div className="font-mono text-[12px] leading-relaxed text-[color:var(--text-secondary)] max-h-40 overflow-y-auto whitespace-pre-wrap border-l-2 border-[color:var(--border-visible)] pl-3">
          {reasoning}
        </div>
      )}
      {content && (
        <div className="font-mono text-[12px] leading-relaxed text-[color:var(--text-secondary)] max-h-60 overflow-y-auto whitespace-pre-wrap border-l-2 border-[color:var(--accent)] pl-3">
          {content}
        </div>
      )}
      <div className="font-mono text-[13px] text-[color:var(--text-disabled)]">
        {t("plan.usesProfile")}
      </div>
    </div>
  );
}
