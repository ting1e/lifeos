"use client";

import { useEffect, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export type LibraryItem = {
  id: string;
  name: string;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  photoPath: string | null;
};

type Props = {
  onPick: (item: LibraryItem) => void;
  disabled?: boolean;
};

export function LibraryPicker({ onPick, disabled }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/food-library");
      if (!r.ok) return;
      const data = (await r.json()) as { items: LibraryItem[] };
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
    if (items.length === 0) load();
  }

  function close() {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      setQuery("");
    }, 150);
  }

  function pick(item: LibraryItem) {
    onPick(item);
    close();
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const filtered = query.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className="btn btn--outline btn--sm"
      >
        <BookOpen size={14} strokeWidth={1.5} className="mr-2" />
        {t("foodLibrary.pickFrom")}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-150 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            onClick={close}
          />

          {/* Panel — centered in viewport */}
          <div
            className={`fixed z-50 inset-x-0 top-[12vh] mx-auto w-[min(640px,calc(100vw-2rem))] bg-[color:var(--surface)] border border-[color:var(--border-visible)] shadow-xl transition-all duration-150 ease-out ${
              visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] flex items-center gap-1.5">
                <BookOpen size={10} strokeWidth={1.75} />
                {t("foodLibrary.title")}
                <span className="text-[color:var(--text-disabled)]">
                  {filtered.length}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] transition-colors"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[color:var(--border)]">
              <Search size={12} strokeWidth={1.5} className="text-[color:var(--text-secondary)] shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("foodLibrary.searchPlaceholder")}
                className="w-full bg-transparent border-b border-transparent focus:border-[color:var(--accent)] py-1 font-body text-sm text-[color:var(--text-display)] focus:outline-none placeholder:text-[color:var(--text-disabled)] transition-colors"
                autoFocus
              />
            </div>

            {/* Items */}
            <div className="max-h-[50vh] overflow-y-auto">
              {loading && (
                <div className="px-4 py-8 text-center font-mono text-[13px] text-[color:var(--text-secondary)]">
                  {t("common.busy")}
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <BookOpen size={20} strokeWidth={1} className="mx-auto mb-2 text-[color:var(--text-disabled)]" />
                  <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">
                    {items.length === 0 ? t("foodLibrary.empty") : t("foodLibrary.noMatch")}
                  </div>
                </div>
              )}
              {!loading &&
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pick(item)}
                    className="group w-full flex items-center gap-3 px-4 py-2.5 border-b border-[color:var(--border)] last:border-b-0 hover:bg-[color:var(--surface-raised)] focus:bg-[color:var(--surface-raised)] focus:outline-none transition-colors relative"
                  >
                    {/* Accent indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[color:var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />

                    {item.photoPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/uploads/${item.photoPath}`}
                        alt=""
                        className="w-9 h-9 object-cover border border-[color:var(--border)] shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 dot-grid-subtle border border-[color:var(--border)] shrink-0" />
                    )}

                    <span className="flex-1 font-body text-base text-[color:var(--text-display)] truncate text-left">
                      {item.name}
                    </span>

                    <div className="font-mono text-[12px] text-[color:var(--text-secondary)] flex items-center gap-2 shrink-0">
                      <span>{item.kcal ?? "?"}<span className="text-[color:var(--text-disabled)] text-[11px] ml-0.5">{t("food.kcal")}</span></span>
                      <span>{item.proteinG ?? "?"}<span className="text-[color:var(--text-disabled)] text-[11px] ml-0.5">P</span></span>
                      <span>{item.carbsG ?? "?"}<span className="text-[color:var(--text-disabled)] text-[11px] ml-0.5">C</span></span>
                      <span>{item.fatG ?? "?"}<span className="text-[color:var(--text-disabled)] text-[11px] ml-0.5">F</span></span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
