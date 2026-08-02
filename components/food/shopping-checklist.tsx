"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ShoppingBasket, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";

export type ShoppingItem = {
  name: string;
  qty?: number;
  unit?: string;
  aisle?: string;
  checked?: boolean;
};

type Props = {
  shoppingListId: string;
  initialItems: ShoppingItem[];
};

const AISLE_ORDER = ["produce", "meat", "dairy", "pantry", "frozen", "other"];

const AISLE_KEYS: Record<string, DictKey> = {
  produce: "plan.aisle.produce",
  meat: "plan.aisle.meat",
  dairy: "plan.aisle.dairy",
  pantry: "plan.aisle.pantry",
  frozen: "plan.aisle.frozen",
  other: "plan.aisle.other",
};

export function ShoppingChecklist({ shoppingListId, initialItems }: Props) {
  const t = useT();
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [hideChecked, setHideChecked] = useState(false);

  function aisleLabel(a?: string): string {
    const key = AISLE_KEYS[(a ?? "other").toLowerCase()];
    return key ? t(key) : (a ?? "OTHER").toUpperCase();
  }
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>(JSON.stringify(initialItems));

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const it of items) {
      const a = (it.aisle ?? "other").toLowerCase();
      const arr = map.get(a) ?? [];
      arr.push(it);
      map.set(a, arr);
    }
    const ordered: Array<[string, ShoppingItem[]]> = [];
    for (const a of AISLE_ORDER) {
      if (map.has(a)) ordered.push([a, map.get(a)!]);
      map.delete(a);
    }
    for (const [a, v] of map) ordered.push([a, v]);
    return ordered;
  }, [items]);

  const done = items.filter((i) => i.checked).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  function persist(next: ShoppingItem[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const body = JSON.stringify({ shoppingListId, items: next });
      if (body === lastSaved.current) return;
      setSaving(true);
      try {
        const r = await fetch("/api/plan/shopping", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body,
        });
        if (r.ok) lastSaved.current = body;
      } finally {
        setSaving(false);
      }
    }, 400);
  }

  // Flush on unmount in case the user closes the tab mid-debounce.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Sync from server when a new plan is generated (router.refresh passes
  // new initialItems). Update lastSaved so we don't immediately re-persist.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setItems(initialItems);
    lastSaved.current = JSON.stringify(initialItems);
  }, [initialItems]);

  function toggle(target: ShoppingItem) {
    setItems((prev) => {
      const next = prev.map((it) =>
        it.name === target.name && it.aisle === target.aisle && it.unit === target.unit
          ? { ...it, checked: !it.checked }
          : it,
      );
      persist(next);
      return next;
    });
  }

  function reset() {
    setItems((prev) => {
      const next = prev.map((it) => ({ ...it, checked: false }));
      persist(next);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
          <ShoppingBasket size={12} strokeWidth={1.75} />
          {t("plan.bought", { done, total, pct })}
          {saving && <span className="text-[color:var(--accent)]">· {t("common.saving")}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHideChecked((v) => !v)}
            className={`font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border ${
              hideChecked
                ? "border-[color:var(--text-display)] text-[color:var(--text-display)]"
                : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)]"
            }`}
          >
            {hideChecked ? t("plan.showAll") : t("plan.hideDone")}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={done === 0}
            className="font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border border-[color:var(--border-visible)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:opacity-30"
          >
            {t("common.reset")}
          </button>
        </div>
      </div>

      <div className="h-1 bg-[color:var(--border)]">
        <div
          className="h-full bg-[color:var(--accent)] transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-4">
        {grouped.map(([aisle, list]) => {
          const visible = hideChecked ? list.filter((i) => !i.checked) : list;
          if (visible.length === 0) return null;
          return (
            <div key={aisle}>
              <div className="mono-label mb-1">{aisleLabel(aisle)}</div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                {visible.map((it, i) => {
                  const id = `${aisle}-${i}-${it.name}`;
                  return (
                    <li key={id}>
                      <label
                        htmlFor={id}
                        className={`flex items-center gap-3 py-2 border-b border-[color:var(--border)] cursor-pointer select-none ${
                          it.checked ? "opacity-50" : ""
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 border ${
                            it.checked
                              ? "bg-[color:var(--accent)] border-[color:var(--accent)] text-[color:var(--surface)]"
                              : "border-[color:var(--border-visible)] text-transparent"
                          }`}
                        >
                          <Check size={14} strokeWidth={2.5} />
                        </span>
                        <input
                          id={id}
                          type="checkbox"
                          className="sr-only"
                          checked={!!it.checked}
                          onChange={() => toggle(it)}
                        />
                        <span
                          className={`font-body text-base flex-1 min-w-0 truncate ${
                            it.checked
                              ? "line-through text-[color:var(--text-secondary)]"
                              : "text-[color:var(--text-display)]"
                          }`}
                        >
                          {it.name}
                        </span>
                        {(it.qty != null || it.unit) && (
                          <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[color:var(--text-secondary)] tabular-nums shrink-0">
                            {it.qty ?? ""} {it.unit ?? ""}
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {total > 0 && done === total && (
        <div className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--success)] border-t border-[color:var(--border)] pt-3">
          <Sparkles size={12} strokeWidth={1.75} />
          {t("plan.allBought")}
        </div>
      )}
    </div>
  );
}
