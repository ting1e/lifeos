"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useT } from "@/lib/i18n/client";
import { isoForDate, todayKey } from "@/lib/utils/day";

type ProgramOpt = { id: string; name: string };
type DayOpt = { id: string; programId: string; dayIndex: number; name: string };

export function NewWorkoutForm({
  programs,
  days,
  initialDate,
  defaultProgramId,
  defaultDayId,
}: {
  programs: ProgramOpt[];
  days: DayOpt[];
  initialDate?: string;
  defaultProgramId?: string;
  defaultDayId?: string;
}) {
  const router = useRouter();
  const t = useT();
  const today = todayKey();
  const [date, setDate] = useState<string>(initialDate ?? today);
  const [programId, setProgramId] = useState<string>(
    defaultProgramId || programs[0]?.id || "",
  );
  const [dayId, setDayId] = useState<string>(defaultDayId || "");
  const [busy, setBusy] = useState(false);

  // Days belonging to the currently selected program.
  const programDays = useMemo(
    () => days.filter((d) => d.programId === programId),
    [days, programId],
  );

  // Auto-select the first day whenever the program changes.
  // (Only when a real program is selected; "free / no program" hides days.)
  const effectiveDayId = programId ? dayId || programDays[0]?.id || "" : "";

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          programId: programId || null,
          programDayId: effectiveDayId || null,
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
      <Select
        value={programId}
        onChange={(e) => {
          setProgramId(e.target.value);
          setDayId("");
        }}
      >
        <option value="">{t("common.freeNoProgram")}</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>

      {programId && programDays.length > 0 && (
        <div>
          <div className="mono-label mb-1">{t("prog.dayLabel")}</div>
          <Select
            value={effectiveDayId}
            onChange={(e) => setDayId(e.target.value)}
          >
            {programDays.map((d) => (
              <option key={d.id} value={d.id}>
                {t("prog.day")} {d.dayIndex + 1} · {d.name}
              </option>
            ))}
          </Select>
        </div>
      )}

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
