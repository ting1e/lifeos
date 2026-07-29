"use client";

import { useState } from "react";
import { useDemoStore, generateId, DEMO_USER_ID } from "@/lib/demo/store";
import { Input } from "@/components/ui/input";

type Pref = { id: string; label: string };

export function PreferencesEditor({
  kind,
  initial,
}: {
  kind: "liked" | "disliked" | "allergy";
  initial: Pref[];
}) {
  const { update } = useDemoStore();
  const [draft, setDraft] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const label = draft.trim();
    setDraft("");
    update((prev) => ({
      foodPreferences: [
        ...prev.foodPreferences,
        { id: generateId(), userId: DEMO_USER_ID, kind, label },
      ],
    }));
  }

  function remove(id: string) {
    update((prev) => ({
      foodPreferences: prev.foodPreferences.filter((i) => i.id !== id),
    }));
  }

  return (
    <div className="space-y-3 mt-2">
      <form onSubmit={add}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="+ add"
        />
      </form>
      <ul className="space-y-0">
        {initial.map((i) => (
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
