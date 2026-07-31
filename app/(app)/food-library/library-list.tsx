"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

type Item = {
  id: string;
  name: string;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  photoPath: string | null;
};

export function LibraryList({ initial }: { initial: Item[] }) {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Item | null>(null);

  async function remove(id: string) {
    setItems(items.filter((i) => i.id !== id));
    await fetch(`/api/food-library/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function startEdit(it: Item) {
    setEditing(it.id);
    setDraft({ ...it });
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(null);
  }

  async function saveEdit() {
    if (!draft) return;
    await fetch(`/api/food-library/${draft.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        kcal: draft.kcal,
        protein_g: draft.proteinG,
        carbs_g: draft.carbsG,
        fat_g: draft.fatG,
      }),
    });
    setItems(items.map((i) => (i.id === draft.id ? draft : i)));
    setEditing(null);
    setDraft(null);
    router.refresh();
  }

  if (items.length === 0) {
    return <div className="font-mono text-base text-[color:var(--text-secondary)] py-6">{t("foodLibrary.empty")}</div>;
  }

  return (
    <ul className="mt-3 space-y-0">
      {items.map((i) => {
        const isEditing = editing === i.id;
        return (
          <li
            key={i.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-3 py-2 border-b border-[color:var(--border)]"
          >
            {isEditing && draft ? (
              <>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="font-body"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  value={draft.kcal ?? ""}
                  onChange={(e) => setDraft({ ...draft, kcal: e.target.value ? Number(e.target.value) : null })}
                  className="w-20 font-mono"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  value={draft.proteinG ?? ""}
                  onChange={(e) => setDraft({ ...draft, proteinG: e.target.value ? Number(e.target.value) : null })}
                  className="w-16 font-mono"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  value={draft.carbsG ?? ""}
                  onChange={(e) => setDraft({ ...draft, carbsG: e.target.value ? Number(e.target.value) : null })}
                  className="w-16 font-mono"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  value={draft.fatG ?? ""}
                  onChange={(e) => setDraft({ ...draft, fatG: e.target.value ? Number(e.target.value) : null })}
                  className="w-16 font-mono"
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={saveEdit}
                    className="text-[color:var(--accent)] hover:opacity-70 p-1"
                    aria-label={t("common.save")}
                  >
                    <Check size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] p-1"
                    aria-label={t("common.cancel")}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              </>
            ) : (
              <>
                {i.photoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/uploads/${i.photoPath}`}
                    alt=""
                    className="w-10 h-10 object-cover border border-[color:var(--border)] shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 dot-grid-subtle border border-[color:var(--border)] shrink-0" />
                )}
                <span className="font-body text-[color:var(--text-display)] truncate">{i.name}</span>
                <span className="font-mono text-[13px] text-[color:var(--text-secondary)] text-right">
                  {i.kcal ?? "?"} {t("food.kcal")}
                </span>
                <span className="font-mono text-[13px] text-[color:var(--text-secondary)] text-right">
                  {i.proteinG ?? "?"}P
                </span>
                <span className="font-mono text-[13px] text-[color:var(--text-secondary)] text-right">
                  {i.carbsG ?? "?"}C
                </span>
                <span className="font-mono text-[13px] text-[color:var(--text-secondary)] text-right">
                  {i.fatG ?? "?"}F
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(i)}
                    className="text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] p-1"
                    aria-label={t("foodLibrary.edit")}
                  >
                    <Pencil size={12} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => remove(i.id)}
                    className="text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] p-1"
                    aria-label="delete"
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </button>
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
