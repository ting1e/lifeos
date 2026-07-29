"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Profile } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/client";

export function ProfileForm({ initial }: { initial: Profile | undefined }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    displayName: initial?.displayName ?? "",
    heightCm: initial?.heightCm ?? "",
    weightKg: initial?.weightKg ?? "",
    age: initial?.age?.toString() ?? "",
    sex: initial?.sex ?? "m",
    activityLevel: initial?.activityLevel ?? "moderate",
    goal: initial?.goal ?? "maintain",
    targetWeightKg: initial?.targetWeightKg ?? "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 mt-4">
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2">
          <div className="mono-label mb-1">{t("prof.displayName")}</div>
          <Input
            type="text"
            value={form.displayName}
            placeholder={t("prof.displayNamePlaceholder")}
            maxLength={80}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
          <div className="font-mono text-[10px] text-[color:var(--text-disabled)] mt-1">
            {t("prof.displayNameHint")}
          </div>
        </div>
        <div>
          <div className="mono-label mb-1">{t("prof.height")}</div>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={form.heightCm as string}
            onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("prof.weight")}</div>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={form.weightKg as string}
            onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("prof.age")}</div>
          <Input
            type="number"
            inputMode="numeric"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("prof.sex")}</div>
          <Select
            value={form.sex}
            onChange={(e) => setForm({ ...form, sex: e.target.value as "m" | "f" })}
          >
            <option value="m">{t("prof.sexMale")}</option>
            <option value="f">{t("prof.sexFemale")}</option>
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">{t("prof.activity")}</div>
          <Select
            value={form.activityLevel}
            onChange={(e) => setForm({ ...form, activityLevel: e.target.value as never })}
          >
            <option value="sedentary">{t("prof.activitySedentary")}</option>
            <option value="light">{t("prof.activityLight")}</option>
            <option value="moderate">{t("prof.activityModerate")}</option>
            <option value="active">{t("prof.activityActive")}</option>
            <option value="very_active">{t("prof.activityVeryActive")}</option>
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">{t("prof.goal")}</div>
          <Select
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value as never })}
          >
            <option value="cut">{t("goal.cut")}</option>
            <option value="maintain">{t("goal.maintain")}</option>
            <option value="bulk">{t("goal.bulk")}</option>
          </Select>
        </div>
        <div className="col-span-2">
          <div className="mono-label mb-1">{t("prof.targetWeight")}</div>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={form.targetWeightKg as string}
            onChange={(e) => setForm({ ...form, targetWeightKg: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? t("common.busy") : t("prof.save")}
        </Button>
      </div>
    </form>
  );
}
