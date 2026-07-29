"use client";

import { useState } from "react";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Insights = {
  summary: string;
  highlights: string[];
  warnings: string[];
  recommendations: string[];
};

// Demo: canned insights. The real app pipes the last 7 days of food / workouts /
// whoop into Claude Sonnet via fal.ai for a real summary.
const CANNED: Insights = {
  summary:
    "Solid cutting week — calories tracked under target on 5 of 7 days while protein stayed above 150g daily. Workout volume held at 12 sets per body part. Sleep dipped mid-week which lined up with two lower-recovery days.",
  highlights: [
    "Weight trend continues down ~0.4kg over 7 days (within the healthy 0.5–1.0% bodyweight/week range for a cut).",
    "Protein hit target on 6 of 7 days — strong adherence.",
    "PPL sessions completed on schedule.",
  ],
  warnings: [
    "Two nights of <7h sleep mid-week dropped recovery to 45 and 52%.",
    "Wednesday's strain (17.2) without matching sleep recovery — risk of fatigue carryover.",
  ],
  recommendations: [
    "Push sleep to 8h target for the next 3 nights to rebuild recovery before Saturday legs.",
    "Add 10g protein at breakfast (Greek yogurt or extra egg) — would close the only macro gap.",
    "Consider a deload week after the next 2-week block if recovery averages stay below 55.",
  ],
};

export function WeeklyInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [busy, setBusy] = useState(false);

  async function gen() {
    setBusy(true);
    // Simulate a short delay so it feels like analysis
    await new Promise((r) => setTimeout(r, 600));
    setData(CANNED);
    setBusy(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardLabel>AI · WEEKLY SUMMARY</CardLabel>
        <Button variant="outline" onClick={gen} disabled={busy}>
          {busy ? "ANALYZING…" : "GENERATE →"}
        </Button>
      </div>
      {data ? (
        <div className="space-y-3 mt-2">
          <p className="font-body text-[color:var(--text-display)]">{data.summary}</p>
          {data.highlights.length > 0 && (
            <div>
              <div className="mono-label mb-1">HIGHLIGHTS</div>
              <ul className="text-base space-y-1">
                {data.highlights.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
          {data.warnings.length > 0 && (
            <div>
              <div className="mono-label mb-1 text-[color:var(--warning)]">WARNINGS</div>
              <ul className="text-base space-y-1">
                {data.warnings.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
          {data.recommendations.length > 0 && (
            <div>
              <div className="mono-label mb-1 text-[color:var(--accent)]">RECOMMENDATIONS</div>
              <ul className="text-base space-y-1">
                {data.recommendations.map((h, i) => (
                  <li key={i}>· {h}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] pt-2 border-t border-[color:var(--border)]">
            Demo: canned summary. The real app generates these with Claude Sonnet via fal.ai.
          </div>
        </div>
      ) : (
        <div className="font-mono text-base text-[color:var(--text-secondary)]">
          Click GENERATE to get a Sonnet-powered review of the last 7 days.
        </div>
      )}
    </Card>
  );
}
