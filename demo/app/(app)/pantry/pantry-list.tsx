"use client";

import { useDemoStore } from "@/lib/demo/store";

type Item = { id: string; name: string; qty: number | null; unit: string | null };

export function PantryList({ initial }: { initial: Item[] }) {
  const { update } = useDemoStore();

  function remove(id: string) {
    update((prev) => ({
      pantryItems: prev.pantryItems.filter((i) => i.id !== id),
    }));
  }

  if (initial.length === 0) {
    return <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">empty</div>;
  }
  return (
    <ul className="mt-3 space-y-0">
      {initial.map((i) => (
        <li
          key={i.id}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 border-b border-[color:var(--border)]"
        >
          <span className="font-body text-[color:var(--text-display)]">{i.name}</span>
          <span className="font-mono text-[13px] text-[color:var(--text-secondary)]">
            {i.qty ?? ""} {i.unit ?? ""}
          </span>
          <button
            onClick={() => remove(i.id)}
            className="font-mono text-[13px] uppercase text-[color:var(--text-secondary)] hover:text-[color:var(--accent)]"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
