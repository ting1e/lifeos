"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";

type Props = {
  initialLocale: Locale;
};

export function LanguageSwitcher({ initialLocale }: Props) {
  const router = useRouter();
  const t = useT();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function pick(next: Locale) {
    if (next === locale || pending) return;
    setErr(null);
    setLocale(next);
    try {
      const r = await fetch("/api/profile/locale", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (!r.ok) throw new Error(`http_${r.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      setLocale(initialLocale);
      setErr(e instanceof Error ? e.message : String(e));
    }
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
            disabled={pending}
            aria-pressed={locale === l}
            className={`font-mono text-[13px] uppercase tracking-[0.1em] px-3 py-2 border ${
              locale === l
                ? "border-[color:var(--text-display)] text-[color:var(--text-display)] bg-[color:var(--surface-raised)]"
                : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)]"
            } disabled:opacity-50`}
          >
            {LOCALE_LABELS[l]}
          </button>
        ))}
      </div>
      <div className="font-mono text-[12px] text-[color:var(--text-disabled)]">
        {t("profile.languageHint")}
      </div>
      {err && (
        <div className="font-mono text-[12px] text-[color:var(--accent)]">ERR · {err}</div>
      )}
    </div>
  );
}
