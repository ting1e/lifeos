"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    setItems(initial);
  }, [initial]);

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
            className="py-2 border-b border-[color:var(--border)]"
          >
            {isEditing && draft ? (
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="font-body min-w-[120px] flex-1"
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
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {i.photoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/uploads/${i.photoPath}`}
                    alt=""
                    className="w-12 h-12 object-cover border border-[color:var(--border)] shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 dot-grid-subtle border border-[color:var(--border)] shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-body text-[color:var(--text-display)] truncate">{i.name}</div>
                  <div className="font-mono text-[13px] text-[color:var(--text-secondary)] mt-0.5">
                    {i.kcal ?? "?"} {t("food.kcal")}
                    <span className="text-[color:var(--text-disabled)] mx-1.5">·</span>
                    {i.proteinG ?? "?"}P
                    <span className="text-[color:var(--text-disabled)] mx-1">·</span>
                    {i.carbsG ?? "?"}C
                    <span className="text-[color:var(--text-disabled)] mx-1">·</span>
                    {i.fatG ?? "?"}F
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
