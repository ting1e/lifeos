"use client";

import { useEffect, useState } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonoStat } from "@/components/nothing/mono-stat";
import { useT } from "@/lib/i18n/client";

type WhoopMatch = {
  whoopId: string;
  sport: string | null;
  start: string;
  end: string;
  durationMin: number;
  strain: number | null;
  avgHr: number | null;
  maxHr: number | null;
  kcal: number | null;
};

export function WhoopStrainCard({ workoutId }: { workoutId: string }) {
  const t = useT();
  const [data, setData] = useState<WhoopMatch | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/workouts/${workoutId}/whoop`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setData(j.match ?? null);
      })
      .catch(() => {
        if (alive) setData(null);
      });
    return () => {
      alive = false;
    };
  }, [workoutId]);

  async function pull() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/workouts/${workoutId}/whoop`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `http_${r.status}`);
      setData(j.match ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardLabel>{t("whoopStrain.title")}</CardLabel>
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
            {t("whoopStrain.displayOnly")}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={pull} disabled={busy}>
          {busy ? t("whoopStrain.syncing") : data ? t("whoopStrain.refresh") : t("whoopStrain.pull")}
        </Button>
      </div>

      {data === undefined && (
        <div className="font-mono text-[13px] text-[color:var(--text-disabled)]">…</div>
      )}

      {data === null && (
        <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">
          {t("whoopStrain.noMatch")}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MonoStat
            label={t("whoopStrain.strain")}
            value={data.strain != null ? data.strain.toFixed(1) : "—"}
          />
          <MonoStat label={t("whoopStrain.kcal")} value={data.kcal ?? "—"} unit="kcal" />
          <MonoStat label={t("whoopStrain.avgHr")} value={data.avgHr ?? "—"} unit="bpm" />
          <MonoStat label={t("whoopStrain.maxHr")} value={data.maxHr ?? "—"} unit="bpm" />
          <div className="col-span-2 md:col-span-4 mono-label">
            {t("whoopStrain.duration")} · {data.durationMin}m · {data.sport ?? t("whoopStrain.workout")}
          </div>
        </div>
      )}

      {error && (
        <div className="font-mono text-[13px] text-[color:var(--accent)] uppercase">
          → {error}
        </div>
      )}
    </Card>
  );
}
