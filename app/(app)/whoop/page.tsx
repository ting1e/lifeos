import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile, whoopRecovery, whoopSleep, whoopStrain, whoopTokens, whoopWorkouts } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { bcp47For } from "@/lib/utils";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonoStat } from "@/components/nothing/mono-stat";
import { Gauge } from "@/components/nothing/gauge";
import Link from "next/link";
import { SyncWhoopButton } from "./sync-button";
import { WhoopHistory } from "@/components/whoop/whoop-history";

export const dynamic = "force-dynamic";

export default async function WhoopPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const { user } = await requireSession();
  const locale = await getLocale();
  const t = tFor(locale);
  const sp = await searchParams;
  const [p] = await db.select({ whoopEnabled: profile.whoopEnabled }).from(profile).where(eq(profile.userId, user.id)).limit(1);
  const whoopEnabled = p?.whoopEnabled ?? true;

  if (!whoopEnabled) {
    return (
      <div className="space-y-6">
        <header>
          <div className="mono-label">{t("whoop.device")}</div>
          <h1 className="font-display text-4xl mt-1">{t("whoop.title")}</h1>
        </header>
        <Card>
          <CardLabel>{t("prof.whoopIntegration")}</CardLabel>
          <p className="font-body text-base text-[color:var(--text-secondary)] mt-2">
            {t("whoop.disabledMsg")}
          </p>
          <div className="mt-4">
            <Link href="/profile">
              <Button>{t("nav.profile")}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const [tok] = await db
    .select({ userId: whoopTokens.userId })
    .from(whoopTokens)
    .where(eq(whoopTokens.userId, user.id))
    .limit(1);

  const connected = Boolean(tok);

  const [rec] = connected
    ? await db
        .select()
        .from(whoopRecovery)
        .where(eq(whoopRecovery.userId, user.id))
        .orderBy(desc(whoopRecovery.date))
        .limit(1)
    : [];

  const [sleep] = connected
    ? await db
        .select()
        .from(whoopSleep)
        .where(eq(whoopSleep.userId, user.id))
        .orderBy(desc(whoopSleep.start))
        .limit(1)
    : [];

  const [strain] = connected
    ? await db
        .select()
        .from(whoopStrain)
        .where(eq(whoopStrain.userId, user.id))
        .orderBy(desc(whoopStrain.date))
        .limit(1)
    : [];

  const recentWorkouts = connected
    ? await db
        .select()
        .from(whoopWorkouts)
        .where(eq(whoopWorkouts.userId, user.id))
        .orderBy(desc(whoopWorkouts.start))
        .limit(10)
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
        <div>
          <div className="mono-label">{t("whoop.device")}</div>
          <h1 className="font-display text-4xl mt-1">{t("whoop.title")}</h1>
        </div>
        {connected ? <SyncWhoopButton /> : null}
      </header>

      {sp.connected === "1" && (
        <div className="font-mono text-[13px] text-[color:var(--success)] uppercase tracking-[0.1em]">
          {t("whoop.connected")}
        </div>
      )}

      {!connected ? (
        <Card>
          <CardLabel>{t("whoop.notConnected")}</CardLabel>
          <p className="font-body text-base text-[color:var(--text-secondary)] mt-2">
            {t("whoop.connectAccount")}
          </p>
          <div className="mt-4">
            <Link href="/api/whoop/connect">
              <Button>{t("whoop.connectButton")}</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="flex flex-col items-center">
              <CardLabel>{t("whoop.recovery")}</CardLabel>
              <Gauge
                value={rec?.score ?? 0}
                max={100}
                size={160}
                unit="%"
                label={t("whoop.today")}
                accentByValue
              />
            </Card>
            <Card>
              <CardLabel>{t("whoop.sleep")}</CardLabel>
              <MonoStat
                label={t("whoop.hours")}
                value={
                  sleep
                    ? (
                        (new Date(sleep.end).getTime() - new Date(sleep.start).getTime()) /
                        3_600_000
                      ).toFixed(1)
                    : "—"
                }
                unit="h"
              />
              <div className="mt-3">
                <MonoStat
                  label={t("whoop.performance")}
                  value={sleep?.performancePct ? Number(sleep.performancePct).toFixed(0) : "—"}
                  unit="%"
                />
              </div>
            </Card>
            <Card>
              <CardLabel>{t("whoop.strain")}</CardLabel>
              <MonoStat
                label={t("whoop.score")}
                value={strain?.score ? Number(strain.score).toFixed(1) : "—"}
              />
              <div className="mt-3">
                <MonoStat label={t("whoop.avgHr")} value={strain?.avgHr ?? "—"} unit="bpm" />
              </div>
            </Card>
          </section>

          <WhoopHistory userId={user.id} days={30} />

          {recentWorkouts.length > 0 && (
            <Card>
              <CardLabel>{t("whoop.recentWorkouts")}</CardLabel>
              <ul className="mt-2 space-y-0">
                {recentWorkouts.map((w) => (
                  <li
                    key={w.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-3 py-2 border-b border-[color:var(--border)]"
                  >
                    <span className="font-body text-base">{w.sport ?? t("whoop.workout")}</span>
                    <span className="font-mono text-[13px] text-[color:var(--text-secondary)]">
                      {new Date(w.start).toLocaleDateString(bcp47For(locale))}
                    </span>
                    <span className="font-mono text-[13px] text-[color:var(--text-display)]">
                      {w.strain ? `${t("whoop.strain")} ${Number(w.strain).toFixed(1)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
