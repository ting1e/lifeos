"use client";

import Link from "next/link";
import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WorkoutsPage() {
  const t = useT();
  const { state } = useDemoStore();

  const recent = [...state.workouts]
    .sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))
    .slice(0, 50);

  const counts = new Map<string, number>();
  for (const s of state.workoutSets) {
    counts.set(s.workoutId, (counts.get(s.workoutId) ?? 0) + 1);
  }

  const libraryCount = state.exercises.length;

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="mono-label">{t("ex.history")}</div>
          <h1 className="font-display text-5xl mt-1">{t("ex.workouts")}</h1>
        </div>
        <Link href="/workouts/new">
          <Button>{t("ex.new")}</Button>
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Link href="/programs" className="border border-[color:var(--border-visible)] py-4 px-4 font-mono text-[13px] uppercase tracking-[0.1em] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)] text-[color:var(--text-secondary)]">
          {t("ex.programs")} →
        </Link>
        <Link href="/workouts/exercises" className="border border-[color:var(--border-visible)] py-4 px-4 font-mono text-[13px] uppercase tracking-[0.1em] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)] text-[color:var(--text-secondary)]">
          {t("ex.exerciseLibrary")} ({libraryCount}) →
        </Link>
      </div>

      <section className="space-y-1">
        {recent.length === 0 ? (
          <Card>
            <div className="font-mono text-base text-[color:var(--text-secondary)] py-8 text-center">
              {t("ex.noWorkoutsYet")} —{" "}
              <Link href="/workouts/new" className="text-[color:var(--accent)]">
                {t("ex.startOne")}
              </Link>
            </div>
          </Card>
        ) : (
          recent.map((w) => {
            const setCount = counts.get(w.id) ?? 0;
            return (
              <Link
                key={w.id}
                href={`/workouts/${w.id}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 border-b border-[color:var(--border)] hover:bg-[color:var(--surface)]"
              >
                <div>
                  <div className="font-mono text-base text-[color:var(--text-display)]">
                    {new Date(w.startedAt).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="mono-label mt-0.5">
                    {w.endedAt ? t("ex.completed") : t("ex.inProgress")}
                  </div>
                </div>
                <div className="font-mono text-base text-[color:var(--text-secondary)]">
                  {setCount} {t("ex.sets")}
                </div>
                <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">→</div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
