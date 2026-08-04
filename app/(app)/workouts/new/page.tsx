import { eq, or, isNull, inArray, desc, isNotNull, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { programs, programDays, workouts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { Card, CardLabel } from "@/components/ui/card";
import { NewWorkoutForm } from "./new-workout-form";
import { todayKey } from "@/lib/utils/day";
import { getLocale, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { user } = await requireSession();
  const t = tFor(await getLocale());
  const sp = await searchParams;

  // All programs the user can access (owned + global templates).
  const progsRaw = await db
    .select()
    .from(programs)
    .where(or(eq(programs.userId, user.id), isNull(programs.userId)));

  // Workouts with a programId, most recent first. The first row tells us
  // which program + day was last used; all rows together give us per-program
  // last-used timestamps for sorting.
  const history = await db
    .select({
      programId: workouts.programId,
      programDayId: workouts.programDayId,
      startedAt: workouts.startedAt,
    })
    .from(workouts)
    .where(and(eq(workouts.userId, user.id), isNotNull(workouts.programId)))
    .orderBy(desc(workouts.startedAt));

  // Build a map: programId → last used timestamp (ms). Used to sort programs
  // so the most recently used appears first.
  const lastUsedMs = new Map<string, number>();
  for (const h of history) {
    if (h.programId && !lastUsedMs.has(h.programId)) {
      lastUsedMs.set(h.programId, h.startedAt.getTime());
    }
  }

  // Sort: most recently used first; never-used programs fall back to createdAt desc.
  const progs = [...progsRaw].sort((a, b) => {
    const aMs = lastUsedMs.get(a.id) ?? 0;
    const bMs = lastUsedMs.get(b.id) ?? 0;
    if (aMs !== bMs) return bMs - aMs;
    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
  });

  const days =
    progs.length > 0
      ? await db
          .select()
          .from(programDays)
          .where(
            inArray(
              programDays.programId,
              progs.map((p) => p.id),
            ),
          )
          .orderBy(programDays.dayIndex)
      : [];

  // Determine the default program + day to pre-select. We want to continue
  // from the last workout: if the last session used day N, this one should
  // default to day N+1 (wrapping to day 1 after the last day).
  let defaultProgramId = progs[0]?.id ?? "";
  let defaultDayId = "";

  if (history.length > 0) {
    const last = history[0];
    // Only use the last workout's program if it still exists in the user's
    // accessible programs (it may have been deleted).
    const lastProgExists = progs.some((p) => p.id === last.programId);
    if (lastProgExists && last.programId) {
      defaultProgramId = last.programId;
      // Find the position of the last used day within that program's day list.
      const progDays = days.filter((d) => d.programId === last.programId);
      if (progDays.length > 0) {
        if (last.programDayId) {
          const pos = progDays.findIndex((d) => d.id === last.programDayId);
          if (pos !== -1) {
            // Advance to the next day, wrapping to the first.
            defaultDayId = progDays[(pos + 1) % progDays.length].id;
          } else {
            // Last used day was deleted from the program; start at day 1.
            defaultDayId = progDays[0].id;
          }
        } else {
          // Last workout had no programDayId; start at day 1.
          defaultDayId = progDays[0].id;
        }
      }
    }
  }

  const initialDate =
    sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : todayKey();

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("work.newSession")}</div>
        <h1 className="font-display text-4xl mt-1">{t("work.startWorkoutTitle")}</h1>
      </header>
      <Card>
        <CardLabel>{t("work.programLabel")}</CardLabel>
        <NewWorkoutForm
          programs={progs}
          days={days}
          initialDate={initialDate}
          defaultProgramId={defaultProgramId}
          defaultDayId={defaultDayId}
        />
      </Card>
    </div>
  );
}
