"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Apple,
  BarChart3,
  BookOpen,
  Calendar,
  Heart,
  LayoutDashboard,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";

type NavItem = { href: string; labelKey: DictKey; icon: LucideIcon };
type NavSection = { titleKey: DictKey; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    titleKey: "nav.sectionOverview",
    items: [
      { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { href: "/analysis", labelKey: "nav.analysis", icon: BarChart3 },
    ],
  },
  {
    titleKey: "nav.sectionTrain",
    items: [
      { href: "/workouts", labelKey: "nav.workouts", icon: Activity },
      { href: "/programs", labelKey: "nav.programs", icon: Calendar },
    ],
  },
  {
    titleKey: "nav.sectionEat",
    items: [
      { href: "/food", labelKey: "nav.food", icon: Apple },
      { href: "/food/plan", labelKey: "nav.mealPlan", icon: Sparkles },
      { href: "/food-library", labelKey: "nav.foodLibrary", icon: BookOpen },
      { href: "/pantry", labelKey: "nav.pantry", icon: ShoppingCart },
    ],
  },
  {
    titleKey: "nav.sectionData",
    items: [
      { href: "/whoop", labelKey: "nav.whoop", icon: Heart },
    ],
  },
];

export function NavSettingsCard({
  initialHidden,
  whoopEnabled,
}: {
  initialHidden: string[];
  whoopEnabled: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [busy, setBusy] = useState(false);

  async function toggle(href: string) {
    const next = new Set(hidden);
    if (next.has(href)) next.delete(href);
    else next.add(href);
    setHidden(next);
    setBusy(true);
    try {
      await fetch("/api/profile/nav-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hidden: Array.from(next) }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 mt-2">
      <p className="font-mono text-[12px] text-[color:var(--text-disabled)]">
        {t("nav.settingsHint")}
      </p>
      {SECTIONS.map((sec) => {
        const items = sec.items;
        if (items.length === 0) return null;
        return (
          <div key={sec.titleKey}>
            <div className="mono-label mb-2">{t(sec.titleKey)}</div>
            <div className="space-y-1">
              {items.map((it) => {
                const isHidden = hidden.has(it.href);
                const disabled = it.href === "/whoop" && !whoopEnabled;
                const Icon = it.icon;
                return (
                  <div
                    key={it.href}
                    className={`flex items-center justify-between gap-3 py-2 px-3 border border-[color:var(--border)] hover:bg-[color:var(--surface-raised)] transition-colors ${
                      disabled ? "opacity-40 pointer-events-none" : ""
                    }`}
                  >
                    <Link
                      href={it.href}
                      className="flex items-center gap-2.5 flex-1 min-w-0"
                    >
                      <Icon size={16} strokeWidth={1.5} className="text-[color:var(--text-secondary)] shrink-0" />
                      <span className="font-body text-base text-[color:var(--text-display)]">
                        {t(it.labelKey)}
                      </span>
                    </Link>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!isHidden}
                      disabled={busy || disabled}
                      onClick={() => toggle(it.href)}
                      className={`relative w-10 h-6 shrink-0 transition-colors ${
                        isHidden
                          ? "bg-[color:var(--border-visible)]"
                          : "bg-[color:var(--accent)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white transition-transform ${
                          isHidden ? "" : "translate-x-4"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
