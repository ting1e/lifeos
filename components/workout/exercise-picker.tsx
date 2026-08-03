"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/client";
import { trCatalog } from "@/lib/i18n/exercise-zh";

type PickerExercise = {
  id: string;
  nameEn: string;
  nameTr: string | null;
  nameZh: string | null;
  bodyPart: string | null;
  equipment: string | null;
  target: string | null;
  gifUrl: string | null;
};

export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exerciseId: string, name: string, gifUrl: string | null) => void | Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PickerExercise[]>([]);
  const [busy, startTransition] = useTransition();
  const locale = useLocale();
  const displayName = (ex: PickerExercise) =>
    locale === "tr" ? ex.nameTr ?? ex.nameEn : locale === "zh" ? ex.nameZh ?? ex.nameEn : ex.nameEn;

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const r = await fetch(`/api/exercises?q=${encodeURIComponent(q)}&limit=30`);
      const j = await r.json();
      setRows(j.exercises ?? []);
    });
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <button
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 dot-grid-subtle"
      />
      <div className="relative w-full md:max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col bg-[color:var(--surface)] border-t md:border border-[color:var(--border-visible)] safe-bottom">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-[color:var(--border)]">
          <div className="mono-label">ADD EXERCISE</div>
          <button
            onClick={onClose}
            aria-label="close"
            className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)] min-h-[44px] min-w-[44px] -mr-3 flex items-center justify-center"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[color:var(--border)]">
          <div className="flex items-center gap-2 border-b border-[color:var(--border-visible)] focus-within:border-[color:var(--accent)]">
            <Search size={16} strokeWidth={1.5} className="text-[color:var(--text-secondary)]" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="bench press, squat, row…"
              className="flex-1 bg-transparent py-3 font-body text-lg text-[color:var(--text-display)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {busy && rows.length === 0 ? (
            <div className="font-mono text-[13px] text-[color:var(--text-disabled)] p-4">
              loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="font-mono text-[13px] text-[color:var(--text-disabled)] p-4">
              no match
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {rows.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => onPick(ex.id, displayName(ex), ex.gifUrl)}
                    className="w-full grid grid-cols-[64px_1fr] gap-3 text-left p-2 border border-[color:var(--border)] hover:border-[color:var(--text-display)] transition"
                  >
                    {ex.gifUrl ? (
                      <Image
                        src={ex.gifUrl}
                        alt={displayName(ex)}
                        width={128}
                        height={128}
                        unoptimized
                        className="w-16 h-16 object-cover border border-[color:var(--border)]"
                      />
                    ) : (
                      <div className="w-16 h-16 dot-grid-subtle border border-[color:var(--border)]" />
                    )}
                    <div className="min-w-0">
                      <div className="font-body text-base text-[color:var(--text-display)] truncate">
                        {displayName(ex)}
                      </div>
                      <div className="mono-label mt-1 truncate">
                        {[trCatalog("target", ex.target, locale), trCatalog("equipment", ex.equipment, locale)].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
