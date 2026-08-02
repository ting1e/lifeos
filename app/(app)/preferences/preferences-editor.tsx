"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/client";

type Pref = { id: string; label: string };

export function PreferencesEditor({
  kind,
  initial,
}: {
  kind: "liked" | "disliked" | "allergy";
  initial: Pref[];
}) {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const label = draft.trim();
    setDraft("");
    const r = await fetch("/api/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, label }),
    });
    const data = await r.json();
    if (data?.id) setItems((prev) => [...prev, { id: data.id, label }]);
    router.refresh();
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/preferences?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3 mt-2">
      <form onSubmit={add}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("pref.addPlaceholder")}
        />
      </form>
      <ul className="space-y-0">
        {items.map((i) => (
          <li
            key={i.id}
            className="grid grid-cols-[1fr_auto] items-center py-2 border-b border-[color:var(--border)]"
          >
            <span className="font-body text-base text-[color:var(--text-display)]">{i.label}</span>
            <button
              onClick={() => remove(i.id)}
              className="font-mono text-[13px] text-[color:var(--text-secondary)] hover:text-[color:var(--accent)]"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
