"use client";

import { useState } from "react";

/**
 * POSTs the current macro fields to /api/food-library as a new item.
 * Shared by NewFoodForm and EditFoodForm — previously copy-pasted in both.
 */
export function useSaveToLibrary() {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(args: {
    name: string;
    kcal: string;
    p: string;
    c: string;
    f: string;
    photoPath?: string | null;
  }) {
    if (!args.name.trim()) return;
    setBusy(true);
    setSaved(false);
    try {
      const r = await fetch("/api/food-library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: args.name,
          kcal: args.kcal ? Number(args.kcal) : null,
          protein_g: args.p ? Number(args.p) : null,
          carbs_g: args.c ? Number(args.c) : null,
          fat_g: args.f ? Number(args.f) : null,
          photoPath: args.photoPath ?? undefined,
        }),
      });
      if (r.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return { busy, saved, save };
}
