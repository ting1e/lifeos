"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useT } from "@/lib/i18n/client";
import { isoForDate, todayKey } from "@/lib/utils/day";

type ProgramOpt = { id: string; name: string };

export function NewWorkoutForm({
  programs,
  initialDate,
}: {
  programs: ProgramOpt[];
  initialDate?: string;
}) {
  const router = useRouter();
  const t = useT();
  const today = todayKey();
  const [date, setDate] = useState<string>(initialDate ?? today);
  const [programId, setProgramId] = useState<string>(programs[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          programId: programId || null,
          startedAt: isoForDate(date),
        }),
      });
      const data = await res.json();
      if (data?.id) router.push(`/workouts/${data.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 mt-2">
      <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
        <option value="">{t("common.freeNoProgram")}</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <div>
        <div className="mono-label mb-1">
          {t("common.date")}
          {date !== today && (
            <span className="ml-2 text-[color:var(--accent)]">· {t("dash.viewing")}</span>
          )}
        </div>
        <Input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value || today)}
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={start} disabled={busy} variant="accent">
          {busy ? t("common.busy") : t("common.startButton")}
        </Button>
      </div>
    </div>
  );
}
