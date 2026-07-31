"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

export function LibraryManualForm() {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/food-library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          kcal: kcal ? Number(kcal) : null,
          protein_g: p ? Number(p) : null,
          carbs_g: c ? Number(c) : null,
          fat_g: f ? Number(f) : null,
        }),
      });
      setName("");
      setKcal("");
      setP("");
      setC("");
      setF("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2">
          <div className="mono-label mb-1">{t("food.name")}</div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("foodLibrary.namePlaceholder")}
            required
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("food.kcal")}</div>
          <Input
            type="number"
            inputMode="numeric"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("food.proteinG")}</div>
          <Input
            type="number"
            inputMode="decimal"
            value={p}
            onChange={(e) => setP(e.target.value)}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("food.carbsG")}</div>
          <Input
            type="number"
            inputMode="decimal"
            value={c}
            onChange={(e) => setC(e.target.value)}
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("food.fatG")}</div>
          <Input
            type="number"
            inputMode="decimal"
            value={f}
            onChange={(e) => setF(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !name.trim()}>
          {busy ? t("common.busy") : `${t("common.save")} →`}
        </Button>
      </div>
    </form>
  );
}
