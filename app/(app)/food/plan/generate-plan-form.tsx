"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { isAiError } from "@/lib/ai/ai-error";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function GeneratePlanForm() {
  const router = useRouter();
  const t = useT();
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gen() {
    setBusy(true);
    setError(null);
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
          {busy ? t("plan.generatingForm") : t("plan.generateForm")}
        </Button>
      </div>
      {error && <div className="font-mono text-[13px] text-[color:var(--accent)]">{error}</div>}
      {error && isAiError(error) && (
        <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">
          {t("common.checkAiConfig")}
        </div>
      )}
      <div className="font-mono text-[13px] text-[color:var(--text-disabled)]">
        {t("plan.usesProfile")}
      </div>
    </div>
  );
}
