"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

type SyncResp = {
  ok: boolean;
  recovery?: number;
  sleep?: number;
  strain?: number;
  workouts?: number;
  errors?: Record<string, string>;
  sinceDays?: number;
  error?: string;
};

export function SyncWhoopButton() {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState<null | number>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string> | null>(null);

  async function sync(days: number) {
    setBusy(days);
    setMsg(null);
    setErrors(null);
    try {
      const r = await fetch(`/api/whoop/sync?days=${days}`, { method: "POST" });
      const data: SyncResp = await r.json();
      if (r.ok && data.ok) {
        const errCount = data.errors ? Object.keys(data.errors).length : 0;
        setMsg(
          t("sync.ok", {
            days: data.sinceDays ?? days,
            rec: data.recovery ?? 0,
            sleep: data.sleep ?? 0,
            strain: data.strain ?? 0,
            workouts: data.workouts ?? 0,
          }) + (errCount > 0 ? ` · ${errCount} err` : ""),
        );
        if (errCount > 0) setErrors(data.errors ?? null);
        router.refresh();
      } else {
        setMsg(t("sync.err", { error: data.error ?? r.status }));
      }
    } catch (e) {
      setMsg(t("sync.err", { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => sync(1)}
          disabled={busy !== null}
          variant="accent"
          size="sm"
        >
          {busy === 1 ? t("sync.syncing") : t("sync.today")}
        </Button>
        <Button
          onClick={() => sync(30)}
          disabled={busy !== null}
          variant="outline"
          size="sm"
        >
          {busy === 30 ? t("sync.syncing") : t("sync.30d")}
        </Button>
        <Button
          onClick={() => sync(180)}
          disabled={busy !== null}
          variant="outline"
          size="sm"
        >
          {busy === 180 ? t("sync.pulling") : t("sync.180d")}
        </Button>
        <Button
          onClick={() => sync(365)}
          disabled={busy !== null}
          variant="outline"
          size="sm"
        >
          {busy === 365 ? t("sync.pulling") : t("sync.1y")}
        </Button>
      </div>
      {msg && (
        <span className="font-mono text-[11px] text-[color:var(--text-secondary)] uppercase tracking-[0.08em]">
          {msg}
        </span>
      )}
      {errors && (
        <div className="font-mono text-[11px] text-[color:var(--accent)] uppercase tracking-[0.06em] text-right max-w-md">
          {Object.entries(errors).map(([k, v]) => (
            <div key={k}>
              → {k}: {v.slice(0, 80)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
