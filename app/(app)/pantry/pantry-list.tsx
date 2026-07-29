"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

type Item = { id: string; name: string; qty: number | null; unit: string | null };

export function PantryList({ initial }: { initial: Item[] }) {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState(initial);

  async function remove(id: string) {
    setItems(items.filter((i) => i.id !== id));
    await fetch(`/api/pantry?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (items.length === 0) {
    return <div className="font-mono text-sm text-[color:var(--text-secondary)] py-6">{t("pantry.empty")}</div>;
  }
  return (
    <ul className="mt-3 space-y-0">
      {items.map((i) => (
        <li
          key={i.id}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 border-b border-[color:var(--border)]"
        >
          <span className="font-body text-[color:var(--text-display)]">{i.name}</span>
          <span className="font-mono text-[11px] text-[color:var(--text-secondary)]">
            {i.qty ?? ""} {i.unit ?? ""}
          </span>
          <button
            onClick={() => remove(i.id)}
            className="font-mono text-[11px] uppercase text-[color:var(--text-secondary)] hover:text-[color:var(--accent)]"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
