"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Insights = {
  summary: string;
  highlights: string[];
  warnings: string[];
  recommendations: string[];
};

export function WeeklyInsights() {
  const t = useT();
  const [data, setData] = useState<Insights | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gen() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/insights/weekly", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `http_${r.status}`);
      setData(j.insights as Insights);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardLabel>{t("anal.weeklySummary")}</CardLabel>
        <Button variant="outline" onClick={gen} disabled={busy}>
          {busy ? t("anal.analyzing") : t("anal.generate")}
        </Button>
      </div>
      {error && <div className="font-mono text-[13px] text-[color:var(--accent)]">{error}</div>}
      {data ? (
        <div className="space-y-3 mt-2">
          <p className="font-body text-[color:var(--text-display)]">{data.summary}</p>
          {data.highlights.length > 0 && (
            <div>
              <div className="mono-label mb-1">{t("anal.highlights")}</div>
              <ul className="text-base space-y-1">
                {data.highlights.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
          {data.warnings.length > 0 && (
            <div>
              <div className="mono-label mb-1 text-[color:var(--warning)]">{t("anal.warnings")}</div>
              <ul className="text-base space-y-1">
                {data.warnings.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
          {data.recommendations.length > 0 && (
            <div>
              <div className="mono-label mb-1 text-[color:var(--accent)]">{t("anal.recommendations")}</div>
              <ul className="text-base space-y-1">
                {data.recommendations.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="font-mono text-base text-[color:var(--text-secondary)]">
          {t("anal.clickGenerate")}
        </div>
      )}
    </Card>
  );
}
