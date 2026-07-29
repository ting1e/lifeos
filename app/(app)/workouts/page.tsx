import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { workouts, workoutSets } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { bcp47For } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const { user } = await requireSession();
  const locale = await getLocale();
  const t = tFor(locale);

  const recent = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, user.id))
    .orderBy(desc(workouts.startedAt))
    .limit(50);

  // Per-workout set count
  const counts = new Map<string, number>();
  if (recent.length > 0) {
    const setsRows = await db.select().from(workoutSets);
    for (const s of setsRows) {
      counts.set(s.workoutId, (counts.get(s.workoutId) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="mono-label">{t("work.history")}</div>
          <h1 className="font-display text-5xl mt-1">{t("work.title")}</h1>
        </div>
        <Link href="/workouts/new">
          <Button>{t("work.new")}</Button>
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Link href="/programs" className="border border-[color:var(--border-visible)] py-4 px-4 font-mono text-[13px] uppercase tracking-[0.1em] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)] text-[color:var(--text-secondary)]">
          {t("work.programs")}
        </Link>
        <Link href="/workouts/exercises" className="border border-[color:var(--border-visible)] py-4 px-4 font-mono text-[13px] uppercase tracking-[0.1em] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)] text-[color:var(--text-secondary)]">
          {t("work.exerciseLibrary")}
        </Link>
      </div>

      <section className="space-y-1">
        {recent.length === 0 ? (
          <Card>
            <div className="font-mono text-base text-[color:var(--text-secondary)] py-8 text-center">
              {t("work.noWorkoutsYet")}{" "}
              <Link href="/workouts/new" className="text-[color:var(--accent)]">
                {t("work.startOne")}
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
                    {new Date(w.startedAt).toLocaleString(bcp47For(locale), {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="mono-label mt-0.5">
                    {w.endedAt ? t("work.completed") : t("work.inProgress")}
                  </div>
                </div>
                <div className="font-mono text-base text-[color:var(--text-secondary)]">
                  {setCount} {t("work.sets")}
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
