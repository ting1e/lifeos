"use client";

import { Languages } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { useDemoStore } from "@/lib/demo/store";

export function LanguageSwitcher() {
  const t = useT();
  const { state, update } = useDemoStore();
  const locale = (state?.profile?.locale ?? "en") as Locale;

  function pick(next: Locale) {
    if (next === locale) return;
    update((prev) => ({
      profile: { ...prev.profile, locale: next, updatedAt: new Date() },
    }));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mono-label">
        <Languages size={12} strokeWidth={1.75} />
        {t("profile.language")}
      </div>
      <div className="flex gap-2">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => pick(l)}
            aria-pressed={locale === l}
            className={`font-mono text-[13px] uppercase tracking-[0.1em] px-3 py-2 border ${
              locale === l
                ? "border-[color:var(--text-display)] text-[color:var(--text-display)] bg-[color:var(--surface-raised)]"
                : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)]"
            }`}
          >
            {LOCALE_LABELS[l]}
          </button>
        ))}
      </div>
      <div className="font-mono text-[12px] text-[color:var(--text-disabled)]">
        {t("profile.languageHint")}
      </div>
    </div>
  );
}
