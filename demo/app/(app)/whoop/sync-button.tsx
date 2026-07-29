"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SyncWhoopButton() {
  const [busy, setBusy] = useState<null | number>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync(days: number) {
    setBusy(days);
    setMsg(null);
    await new Promise((r) => setTimeout(r, 500));
    setMsg(
      `DEMO · already synced · ${days}d · rec ${days} · sleep ${days} · strain ${days} · workouts 12`,
    );
    setBusy(null);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => sync(30)}
          disabled={busy !== null}
          variant="outline"
          size="sm"
        >
          {busy === 30 ? "SYNCING…" : "SYNC 30D"}
        </Button>
        <Button
          onClick={() => sync(180)}
          disabled={busy !== null}
          variant="outline"
          size="sm"
        >
          {busy === 180 ? "PULLING…" : "PULL 180D"}
        </Button>
        <Button
          onClick={() => sync(365)}
          disabled={busy !== null}
          variant="outline"
          size="sm"
        >
          {busy === 365 ? "PULLING…" : "PULL 1Y"}
        </Button>
      </div>
      {msg && (
        <span className="font-mono text-[13px] text-[color:var(--text-secondary)] uppercase tracking-[0.08em]">
          {msg}
        </span>
      )}
    </div>
  );
}
