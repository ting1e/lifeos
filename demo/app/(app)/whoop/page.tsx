"use client";

import Link from "next/link";
import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonoStat } from "@/components/nothing/mono-stat";
import { Gauge } from "@/components/nothing/gauge";
import { SyncWhoopButton } from "./sync-button";
import { WhoopHistory } from "@/components/whoop/whoop-history";

export default function WhoopPage() {
  const t = useT();
  const { state, update } = useDemoStore();
  const whoopEnabled = state.whoopEnabled;
  const connected = whoopEnabled && state.whoopConnected;

  if (!whoopEnabled) {
    return (
      <div className="space-y-6">
        <header>
          <div className="mono-label">{t("whoop.device")}</div>
          <h1 className="font-display text-5xl mt-1">{t("whoop.title")}</h1>
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

  const rec = connected
    ? [...state.whoopRecovery].sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined;
  const sleep = connected
    ? [...state.whoopSleep].sort(
        (a, b) => +new Date(b.start) - +new Date(a.start),
      )[0]
    : undefined;
  const strain = connected
    ? [...state.whoopStrain].sort((a, b) => b.date.localeCompare(a.date))[0]
    : undefined;
  const recentWorkouts = connected
    ? [...state.whoopWorkouts]
        .sort((a, b) => +new Date(b.start) - +new Date(a.start))
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
        <div>
          <div className="mono-label">{t("whoop.device")}</div>
          <h1 className="font-display text-5xl mt-1">{t("whoop.title")}</h1>
        </div>
        {connected ? <SyncWhoopButton /> : null}
      </header>

      {!connected ? (
        <Card>
          <CardLabel>{t("whoop.notConnected")}</CardLabel>
          <p className="font-body text-base text-[color:var(--text-secondary)] mt-2">
            {t("whoop.connectDesc")}
          </p>
          <p className="font-mono text-[13px] text-[color:var(--text-disabled)] uppercase tracking-[0.08em] mt-2">
            {t("whoop.demoBehavior")}
          </p>
          <div className="mt-4">
            <Button onClick={() => update({ whoopConnected: true })}>
              {t("whoop.connectButton")}
            </Button>
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

          <WhoopHistory days={30} />

          {recentWorkouts.length > 0 && (
            <Card>
              <CardLabel>{t("whoop.recentWorkouts")}</CardLabel>
              <ul className="mt-2 space-y-0">
                {recentWorkouts.map((w) => (
                  <li
                    key={w.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-3 py-2 border-b border-[color:var(--border)]"
                  >
                    <span className="font-body text-base">{w.sport ?? "workout"}</span>
                    <span className="font-mono text-[13px] text-[color:var(--text-secondary)]">
                      {new Date(w.start).toLocaleDateString("en-US")}
                    </span>
                    <span className="font-mono text-[13px] text-[color:var(--text-display)]">
                      {w.strain ? `strain ${Number(w.strain).toFixed(1)}` : ""}
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
