"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

export function PantryForm() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/pantry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, qty: qty || null, unit: unit || null }),
      });
      setName("");
      setQty("");
      setUnit("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_auto] gap-3 mt-2">
      <Input placeholder={t("pantry.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        placeholder={t("pantry.qtyPlaceholder")}
        inputMode="decimal"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
      />
      <Input
        placeholder={t("pantry.unitPlaceholder")}
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
      />
      <Button type="submit" disabled={busy}>
        +
      </Button>
    </form>
  );
}
