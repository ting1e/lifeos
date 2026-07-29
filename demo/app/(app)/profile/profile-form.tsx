"use client";

import { useState } from "react";
import { useDemoStore } from "@/lib/demo/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Profile } from "@/lib/db/schema";

export function ProfileForm({ initial }: { initial: Profile | undefined }) {
  const { update } = useDemoStore();
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
      update((prev) => ({
        profile: {
          ...prev.profile,
          displayName: form.displayName || null,
          heightCm: form.heightCm ? String(form.heightCm) : null,
          weightKg: form.weightKg ? String(form.weightKg) : null,
          age: form.age ? Number(form.age) : null,
          sex: form.sex as Profile["sex"],
          activityLevel: form.activityLevel as Profile["activityLevel"],
          goal: form.goal as Profile["goal"],
          targetWeightKg: form.targetWeightKg ? String(form.targetWeightKg) : null,
          updatedAt: new Date(),
        },
      }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 mt-4">
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2">
          <div className="mono-label mb-1">DISPLAY NAME</div>
          <Input
            type="text"
            value={form.displayName}
            placeholder="Ege"
            maxLength={80}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
          <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-1">
            shown in the dashboard greeting · leave blank to fall back to your email
          </div>
        </div>
        <div>
          <div className="mono-label mb-1">HEIGHT (CM)</div>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={form.heightCm as string}
            onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
          />
        </div>
        <div>
          <div className="mono-label mb-1">WEIGHT (KG)</div>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={form.weightKg as string}
            onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
          />
        </div>
        <div>
          <div className="mono-label mb-1">AGE</div>
          <Input
            type="number"
            inputMode="numeric"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
        </div>
        <div>
          <div className="mono-label mb-1">SEX</div>
          <Select
            value={form.sex ?? "m"}
            onChange={(e) => setForm({ ...form, sex: e.target.value as "m" | "f" })}
          >
            <option value="m">male</option>
            <option value="f">female</option>
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">ACTIVITY</div>
          <Select
            value={form.activityLevel ?? "moderate"}
            onChange={(e) => setForm({ ...form, activityLevel: e.target.value as never })}
          >
            <option value="sedentary">sedentary</option>
            <option value="light">light</option>
            <option value="moderate">moderate</option>
            <option value="active">active</option>
            <option value="very_active">very active</option>
          </Select>
        </div>
        <div>
          <div className="mono-label mb-1">GOAL</div>
          <Select
            value={form.goal ?? "maintain"}
            onChange={(e) => setForm({ ...form, goal: e.target.value as never })}
          >
            <option value="cut">cut</option>
            <option value="maintain">maintain</option>
            <option value="bulk">bulk</option>
          </Select>
        </div>
        <div className="col-span-2">
          <div className="mono-label mb-1">TARGET WEIGHT (KG)</div>
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
          {busy ? "..." : "SAVE →"}
        </Button>
      </div>
    </form>
  );
}
