"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, History, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { FoodSuggestion } from "@/app/api/food/suggest/route";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: FoodSuggestion) => void;
  disabled?: boolean;
};

function ago(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function FoodNameAutocomplete({ value, onChange, onPick, disabled }: Props) {
  const t = useT();
  const [items, setItems] = useState<FoodSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [exactMatch, setExactMatch] = useState<FoodSuggestion | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      setExactMatch(null);
      return;
    }
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/food/suggest?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        if (!r.ok) return;
        const data = (await r.json()) as { suggestions: FoodSuggestion[] };
        setItems(data.suggestions);
        const exact = data.suggestions.find((s) => norm(s.name) === norm(q)) ?? null;
        setExactMatch(exact);
      } catch {
        /* aborted or network */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [open]);

  function pick(s: FoodSuggestion) {
    onPick(s);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        required
        autoComplete="off"
      />

      {exactMatch && (
        <button
          type="button"
          onClick={() => pick(exactMatch)}
          className="mt-1 inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.08em] px-2 py-1 border border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-[color:var(--surface)]"
        >
          <Sparkles size={10} strokeWidth={1.75} />
          {t("food.matchKcalUse", { kcal: exactMatch.kcal ?? "?" })}
        </button>
      )}

      {open && items.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-[color:var(--surface)] border border-[color:var(--border-visible)] shadow-lg max-h-80 overflow-y-auto">
          {items.filter((s) => s.source === "library").length > 0 && (
            <>
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] px-3 py-2 border-b border-[color:var(--border)] flex items-center gap-1.5">
                <BookOpen size={10} strokeWidth={1.75} />
                {t("food.fromLibrary")}
              </div>
              {items.filter((s) => s.source === "library").map((s) => (
                <SuggestionButton key={"lib-" + s.name} s={s} onPick={pick} t={t} />
              ))}
            </>
          )}
          {items.filter((s) => s.source === "history").length > 0 && (
            <>
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] px-3 py-2 border-b border-[color:var(--border)] flex items-center gap-1.5">
                <History size={10} strokeWidth={1.75} />
                {t("food.fromHistory")} · {items.filter((s) => s.source === "history").length}
              </div>
              {items.filter((s) => s.source === "history").map((s) => (
                <SuggestionButton key={"his-" + s.name + s.lastUsed} s={s} onPick={pick} t={t} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionButton({
  s,
  onPick,
  t,
}: {
  s: FoodSuggestion;
  onPick: (s: FoodSuggestion) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(s)}
      className="w-full flex items-center gap-3 text-left px-3 py-2 border-b border-[color:var(--border)] last:border-b-0 hover:bg-[color:var(--border)] focus:bg-[color:var(--border)] focus:outline-none"
    >
      {s.photoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/uploads/${s.photoPath}`}
          alt=""
          className="w-9 h-9 object-cover border border-[color:var(--border)] shrink-0"
        />
      ) : (
        <div className="w-9 h-9 dot-grid-subtle border border-[color:var(--border)] shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-body text-base text-[color:var(--text-display)] line-clamp-1">
          {s.name}
        </div>
        <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] mt-0.5 flex flex-wrap gap-x-3">
          <span>{s.kcal ?? "?"} {t("food.kcal")}</span>
          <span>{s.proteinG ?? "?"}P</span>
          <span>{s.carbsG ?? "?"}C</span>
          <span>{s.fatG ?? "?"}F</span>
          {s.source === "history" && s.lastUsed && (
            <span className="text-[color:var(--accent)]">
              {s.uses}× · {ago(s.lastUsed)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
