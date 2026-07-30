import Link from "next/link";
import {
  Activity,
  Flame,
  HeartPulse,
  Moon,
  Scale,
  Zap,
} from "lucide-react";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  bodyMetrics,
  foodEntries,
  profile,
  whoopRecovery,
  whoopSleep,
  whoopStrain,
  whoopTokens,
  workouts,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { MonoStat } from "@/components/nothing/mono-stat";
import { SegmentBar } from "@/components/nothing/segment-bar";
import { Ticker } from "@/components/nothing/ticker";
import { Gauge } from "@/components/nothing/gauge";
import { Card, CardLabel } from "@/components/ui/card";
import { MacroBlock } from "@/components/food/macro-block";
import { WeightProjection } from "@/components/dashboard/weight-projection";
import { DayNav } from "@/components/dashboard/day-nav";
import { bmi, bmr, macroSplit, recommendedKcal, tdee } from "@/lib/nutrition";
import { getMeasuredTdee } from "@/lib/whoop/tdee";
import { bcp47For, formatKg, greetingFor, resolveDisplayName } from "@/lib/utils";
import { todayKey } from "@/lib/utils/day";
import { getLocale, tFor } from "@/lib/i18n/server";

function formatDayShort(dateStr: string, locale: "tr" | "en" | "zh" = "en"): string {
  // dateStr is "YYYY-MM-DD" from a Postgres date column
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(+d)) return dateStr;
  return d.toLocaleDateString(bcp47For(locale), { day: "2-digit", month: "short" }).toUpperCase();
}

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { user } = await requireSession();
  const sp = await searchParams;
  const locale = await getLocale();
  const t = tFor(locale);
  const today = todayKey();
  const selectedKey =
    sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : today;
  const isToday = selectedKey === today;

  const dayStart = new Date(`${selectedKey}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [prof] = await db.select().from(profile).where(eq(profile.userId, user.id)).limit(1);

  const whoopEnabled = prof?.whoopEnabled ?? true;
  const [whoopRow] = whoopEnabled
    ? await db
        .select({ userId: whoopTokens.userId })
        .from(whoopTokens)
        .where(eq(whoopTokens.userId, user.id))
        .limit(1)
    : [];
  const whoopConnected = !!whoopRow;

  const todayFood = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, user.id),
        gte(foodEntries.consumedAt, dayStart),
        lt(foodEntries.consumedAt, dayEnd),
      ),
    );

  const totalKcal = todayFood.reduce((a, e) => a + Number(e.kcal ?? 0), 0);
  const totalP = todayFood.reduce((a, e) => a + Number(e.proteinG ?? 0), 0);
  const totalC = todayFood.reduce((a, e) => a + Number(e.carbsG ?? 0), 0);
  const totalF = todayFood.reduce((a, e) => a + Number(e.fatG ?? 0), 0);

  const [recentWeight] = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, user.id))
    .orderBy(desc(bodyMetrics.recordedAt))
    .limit(1);

  const weightKg = Number(prof?.weightKg ?? recentWeight?.weightKg ?? 0);
  const heightCm = Number(prof?.heightCm ?? 0);
  const age = prof?.age ?? 0;
  const sex = prof?.sex ?? "m";
  const activity = prof?.activityLevel ?? "moderate";
  const goal = prof?.goal ?? "maintain";

  const computedBmi = weightKg && heightCm ? bmi(weightKg, heightCm) : 0;
  const computedBmr =
    weightKg && heightCm && age ? bmr({ sex, weightKg, heightCm, age }) : 0;
  const formulaTdee = computedBmr ? tdee(computedBmr, activity) : 0;
  const measured = whoopEnabled ? await getMeasuredTdee(user.id) : null;
  const computedTdee = measured?.kcal ?? formulaTdee;
  const tdeeSource: "whoop" | "formula" = measured ? "whoop" : "formula";
  const kcalTarget = computedTdee ? Math.round(recommendedKcal(computedTdee, goal)) : 0;
  const macroTargets =
    kcalTarget > 0 && weightKg > 0 ? macroSplit(kcalTarget, weightKg, goal) : null;

  const [recovery] = whoopConnected
    ? await db
        .select()
        .from(whoopRecovery)
        .where(and(eq(whoopRecovery.userId, user.id), eq(whoopRecovery.date, selectedKey)))
        .limit(1)
    : [];

  const [sleep] = whoopConnected
    ? await db
        .select()
        .from(whoopSleep)
        .where(
          and(
            eq(whoopSleep.userId, user.id),
            gte(whoopSleep.start, dayStart),
            lt(whoopSleep.start, dayEnd),
          ),
        )
        .orderBy(desc(whoopSleep.start))
        .limit(1)
    : [];

  const sleepHours = sleep
    ? (new Date(sleep.end).getTime() - new Date(sleep.start).getTime()) / 3_600_000
    : null;

  const [strain] = whoopConnected
    ? await db
        .select()
        .from(whoopStrain)
        .where(and(eq(whoopStrain.userId, user.id), eq(whoopStrain.date, selectedKey)))
        .limit(1)
    : [];

  const [lastWorkout] = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, user.id))
    .orderBy(desc(workouts.startedAt))
    .limit(1);

  const headerDate = dayStart.toLocaleDateString(
    bcp47For(locale),
    { weekday: "long", day: "2-digit", month: "short" },
  );

  const name = resolveDisplayName({ displayName: prof?.displayName, email: user.email });
  const greeting = greetingFor(locale, name);
  const kcalLabel = isToday
    ? t("dash.kcalToday")
    : `${t("dash.kcalOn")} ${formatDayShort(selectedKey, locale)}`;
  const goalLabelKey: "goal.cut" | "goal.maintain" | "goal.bulk" =
    goal === "cut" ? "goal.cut" : goal === "bulk" ? "goal.bulk" : "goal.maintain";

  return (
    <div className="space-y-8">
      <header>
        <div className="mono-label">
          {headerDate.toUpperCase()}
          {!isToday && (
            <span className="ml-2 text-[color:var(--accent)]">{t("dash.viewing")}</span>
          )}
        </div>
        <h1 className="font-display text-4xl md:text-5xl mt-1">{greeting}</h1>
      </header>

      <div className="flex items-center gap-4 py-2 px-1 -mx-4 px-4 border-b border-[color:var(--border)]">
        <Ticker
          bare
          className="flex-1 min-w-0"
          items={[
            { label: t("dash.bmi"), value: computedBmi ? computedBmi.toFixed(1) : "—" },
            {
              label: tdeeSource === "whoop" ? t("dash.tdeeWhoop") : t("dash.tdeeEst"),
              value: computedTdee ? `${Math.round(computedTdee)}` : "—",
            },
            { label: t("dash.target"), value: kcalTarget ? `${kcalTarget}` : "—" },
            { label: t("dash.weight"), value: weightKg ? `${formatKg(weightKg)}kg` : "—" },
            { label: t("dash.goal"), value: t(goalLabelKey) },
          ]}
        />
        <DayNav selected={selectedKey} today={today} />
      </div>

      <section
        className={`grid gap-4 ${
          whoopConnected ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"
        }`}
      >
        <Card>
          <div className="flex flex-col gap-2">
            <div className="mono-label flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center text-[color:var(--text-secondary)]" aria-hidden>
                <Flame size={12} strokeWidth={1.75} />
              </span>
              {kcalLabel}
            </div>
            <div className="flex items-baseline gap-3">
              <div className="font-mono text-3xl md:text-4xl tabular-nums leading-none text-[color:var(--text-display)]">
                {Math.round(totalKcal)}
              </div>
              <div className="font-mono text-[13px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)]">
                / {kcalTarget || "?"}
              </div>
              {kcalTarget > 0 && totalKcal > kcalTarget && (
                <div className="font-mono text-4xl md:text-5xl tabular-nums leading-none text-[color:var(--accent)] ml-auto">
                  +{Math.round(totalKcal - kcalTarget)}
                </div>
              )}
            </div>
          </div>
          {kcalTarget > 0 && (
            <div className="mt-4">
              <SegmentBar
                value={Math.min(totalKcal, kcalTarget)}
                max={kcalTarget}
                color={
                  totalKcal > kcalTarget * 1.1
                    ? "var(--accent)"
                    : totalKcal < kcalTarget * 0.8
                      ? "var(--warning)"
                      : "var(--success)"
                }
              />
            </div>
          )}
        </Card>

        {whoopConnected && (
          <Card>
            <MonoStat
              label={t("dash.strain")}
              value={strain?.score ? Number(strain.score).toFixed(1) : "—"}
              icon={<Zap size={12} strokeWidth={1.75} />}
            />
            {strain?.score != null && (
              <div className="mt-4">
                <SegmentBar
                  value={Number(strain.score)}
                  max={21}
                  color="var(--text-display)"
                />
              </div>
            )}
          </Card>
        )}

        {whoopConnected && (
          <Card>
            <MonoStat
              label={t("dash.sleep")}
              value={sleepHours ? sleepHours.toFixed(1) : "—"}
              unit="h"
              icon={<Moon size={12} strokeWidth={1.75} />}
            />
            {sleep?.performancePct != null && (
              <div className="font-mono text-[12px] text-[color:var(--text-secondary)] uppercase tracking-[0.08em] mt-2">
                {t("dash.sleepPerformance")} {Number(sleep.performancePct).toFixed(0)}%
              </div>
            )}
          </Card>
        )}

        <Card>
          <MonoStat
            label={t("dash.weight")}
            value={weightKg ? formatKg(weightKg) : "—"}
            unit="kg"
            icon={<Scale size={12} strokeWidth={1.75} />}
          />
        </Card>
      </section>

      <section
        className={`grid gap-4 items-stretch ${
          whoopConnected
            ? "grid-cols-1 md:grid-cols-[minmax(260px,1fr)_2fr]"
            : "grid-cols-1"
        }`}
      >
        {whoopConnected && (
          <Card className="flex flex-col items-center gap-3">
            <CardLabel className="flex items-center gap-1.5 self-start">
              <HeartPulse size={12} strokeWidth={1.75} />
              {isToday
                ? t("dash.recoveryToday")
                : `${t("dash.recoveryOn")} ${formatDayShort(selectedKey, locale)}`}
            </CardLabel>
            <Gauge
              value={recovery?.score ?? 0}
              max={100}
              size={140}
              unit="%"
              label={recovery?.date ? formatDayShort(recovery.date, locale) : "—"}
              accentByValue
            />
            <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-[color:var(--border)] mt-auto">
              <MonoStat
                label={t("dash.hrv")}
                value={recovery?.hrvMs ? Number(recovery.hrvMs).toFixed(0) : "—"}
                unit="ms"
                icon={<Activity size={12} strokeWidth={1.75} />}
              />
              <MonoStat
                label={t("dash.rhr")}
                value={recovery?.rhr ?? "—"}
                unit="bpm"
                icon={<HeartPulse size={12} strokeWidth={1.75} />}
              />
            </div>
          </Card>
        )}

        <MacroBlock
          protein={totalP}
          carbs={totalC}
          fat={totalF}
          kcal={totalKcal}
          kcalTarget={kcalTarget}
          proteinTarget={macroTargets?.proteinG ?? null}
          carbsTarget={macroTargets?.carbsG ?? null}
          fatTarget={macroTargets?.fatG ?? null}
        />
      </section>

      {!whoopConnected && whoopEnabled && (
        <Link
          href="/whoop"
          className="block border border-dashed border-[color:var(--border-visible)] px-4 py-3 text-center font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
        >
          {t("dash.connectWhoop")}
        </Link>
      )}

      <section>
        <WeightProjection
          sex={sex}
          heightCm={heightCm}
          age={age}
          activity={activity}
          startWeightKg={weightKg}
          dailyKcalIntake={kcalTarget}
          goalWeightKg={prof?.targetWeightKg ? Number(prof.targetWeightKg) : null}
        />
      </section>

      <section>
        <Card>
          <CardLabel>{t("dash.lastWorkout")}</CardLabel>
          {lastWorkout ? (
            <div>
              <div className="font-display text-3xl">
                {new Date(lastWorkout.startedAt).toLocaleDateString(
                  bcp47For(locale),
                  { day: "2-digit", month: "short" },
                )}
              </div>
              <div className="mono-label mt-1">
                {lastWorkout.endedAt ? t("dash.completed") : t("dash.inProgress")}
              </div>
              <Link
                href={`/workouts/${lastWorkout.id}`}
                className="font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--accent)] mt-3 inline-block"
              >
                {t("common.open")} →
              </Link>
            </div>
          ) : (
            <div className="font-mono text-base text-[color:var(--text-secondary)]">
              {t("dash.noWorkoutYet")}{" "}
              <Link href="/workouts/new" className="text-[color:var(--accent)]">
                {t("dash.startOne")}
              </Link>
            </div>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { href: "/workouts/new", label: t("dash.startWorkout") },
          { href: "/food/new", label: t("dash.logMeal") },
          { href: "/food/plan", label: t("dash.generatePlan") },
          { href: "/analysis", label: t("nav.analysis").toUpperCase() },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="border border-[color:var(--border-visible)] py-4 px-3 text-center font-mono text-[13px] uppercase tracking-[0.1em] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)] text-[color:var(--text-secondary)]"
          >
            {a.label} →
          </Link>
        ))}
      </section>
    </div>
  );
}
