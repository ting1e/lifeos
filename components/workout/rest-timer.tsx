"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

export function RestTimer({ seconds = 90, onDone }: { seconds?: number; onDone?: () => void }) {
  const t = useT();
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      onDone?.();
      return;
    }
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [running, remaining, onDone]);

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-3">
      <div className="font-mono text-3xl tabular-nums text-[color:var(--text-display)]">
        {mm}:{ss}
      </div>
      <button
        onClick={() => setRunning(!running)}
        className="font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)]"
      >
        {running ? t("timer.pause") : t("timer.resume")}
      </button>
      <button
        onClick={() => setRemaining(seconds)}
        className="font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)]"
      >
        {t("common.reset")}
      </button>
    </div>
  );
}
