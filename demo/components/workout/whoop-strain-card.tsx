"use client";

import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/demo/store";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonoStat } from "@/components/nothing/mono-stat";

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
  const { state } = useDemoStore();
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(true);

  // Match a Whoop workout by its closest start time to this workout.
  const data = useMemo<WhoopMatch | null>(() => {
    if (!revealed) return null;
    const w = state.workouts.find((x) => x.id === workoutId);
    if (!w) return null;
    const t = +new Date(w.startedAt);
    const closest = [...state.whoopWorkouts]
      .map((ww) => ({ ww, diff: Math.abs(+new Date(ww.start) - t) }))
      .sort((a, b) => a.diff - b.diff)[0];
    if (!closest || closest.diff > 6 * 3_600_000) return null;
    const ww = closest.ww;
    const durationMin = Math.round(
      (+new Date(ww.end) - +new Date(ww.start)) / 60_000,
    );
    return {
      whoopId: ww.whoopId,
      sport: ww.sport,
      start: new Date(ww.start).toISOString(),
      end: new Date(ww.end).toISOString(),
      durationMin,
      strain: ww.strain != null ? Number(ww.strain) : null,
      avgHr: null,
      maxHr: null,
      kcal: null,
    };
  }, [state, workoutId, revealed]);

  async function pull() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    setRevealed(true);
    setBusy(false);
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardLabel>WHOOP STRAIN</CardLabel>
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
            display-only — not deducted from kcal target
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={pull} disabled={busy}>
          {busy ? "SYNCING…" : data ? "REFRESH" : "PULL FROM WHOOP"}
        </Button>
      </div>

      {!data && (
        <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">
          No Whoop activity matches this workout&apos;s time window.
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MonoStat
            label="STRAIN"
            value={data.strain != null ? data.strain.toFixed(1) : "—"}
          />
          <MonoStat label="KCAL" value={data.kcal ?? "—"} unit="kcal" />
          <MonoStat label="AVG HR" value={data.avgHr ?? "—"} unit="bpm" />
          <MonoStat label="MAX HR" value={data.maxHr ?? "—"} unit="bpm" />
          <div className="col-span-2 md:col-span-4 mono-label">
            DURATION · {data.durationMin}m · {data.sport ?? "workout"}
          </div>
        </div>
      )}
    </Card>
  );
}
