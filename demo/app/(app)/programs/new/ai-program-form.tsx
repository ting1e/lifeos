"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type Goal = "strength" | "hypertrophy" | "fat_loss" | "general" | "endurance";
type Level = "beginner" | "intermediate" | "advanced";

const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "kettlebell",
  "bodyweight",
  "bands",
];

export function AiProgramForm() {
  const t = useT();
  const [goal, setGoal] = useState<Goal>("hypertrophy");
  const [level, setLevel] = useState<Level>("intermediate");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [equipment, setEquipment] = useState<string[]>([
    "barbell",
    "dumbbell",
    "cable",
    "machine",
  ]);
  const [focus, setFocus] = useState("");
  const [injuries, setInjuries] = useState("");

  const [status, setStatus] = useState<string | null>(null);

  function toggleEquipment(item: string) {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  }

  function generate(e: React.FormEvent) {
    e.preventDefault();
    setStatus(t("prog.aiDemoMessage"));
  }

  return (
    <form onSubmit={generate} className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles size={16} strokeWidth={1.5} className="text-[color:var(--accent)]" />
        <div className="mono-label">{t("prog.aiAutopilotLabel")}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="mono-label mb-1">{t("prog.goalLabel")}</div>
          <Select
            value={goal}
            onChange={(e) => setGoal(e.target.value as Goal)}
          >
            <option value="strength">{t("prog.strength")}</option>
            <option value="hypertrophy">{t("prog.hypertrophy")}</option>
            <option value="fat_loss">{t("prog.fatLoss")}</option>
            <option value="endurance">{t("prog.endurance")}</option>
            <option value="general">{t("prog.generalFitness")}</option>
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">{t("prog.experienceLabel")}</div>
          <Select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
          >
            <option value="beginner">{t("prog.beginner")}</option>
            <option value="intermediate">{t("prog.intermediate")}</option>
            <option value="advanced">{t("prog.advanced")}</option>
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">{t("prog.daysPerWeekLabel")}</div>
          <Select
            value={String(daysPerWeek)}
            onChange={(e) => setDaysPerWeek(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">{t("prog.sessionLengthLabel")}</div>
          <Select
            value={String(sessionMinutes)}
            onChange={(e) => setSessionMinutes(Number(e.target.value))}
          >
            {[30, 45, 60, 75, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} {t("prog.minLabel")}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <div className="mono-label mb-2">{t("prog.equipmentLabel")}</div>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((item) => {
            const active = equipment.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleEquipment(item)}
                className={active ? "chip chip--active" : "chip"}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mono-label mb-1">{t("prog.focusNotesLabel")}</div>
        <textarea
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          rows={2}
          placeholder={t("prog.focusPlaceholder")}
          className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] resize-none placeholder:text-[color:var(--text-disabled)]"
        />
      </div>

      <div>
        <div className="mono-label mb-1">{t("prog.injuriesLimitsLabel")}</div>
        <textarea
          value={injuries}
          onChange={(e) => setInjuries(e.target.value)}
          rows={2}
          placeholder={t("prog.injuriesPlaceholder")}
          className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-2 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)] resize-none placeholder:text-[color:var(--text-disabled)]"
        />
      </div>

      {status && (
        <div className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] leading-relaxed">
          → {status}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="submit" variant="accent" disabled={equipment.length === 0}>
          {t("prog.generateProgramButton")}
        </Button>
      </div>
    </form>
  );
}
