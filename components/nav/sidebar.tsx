"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Apple,
  BarChart3,
  Calendar,
  Heart,
  LayoutDashboard,
  LogOut,
  ShoppingCart,
  Sparkles,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";

type Item = { href: string; labelKey: DictKey; icon: typeof Activity };
type Section = { titleKey: DictKey; items: Item[] };

const SECTIONS: Section[] = [
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
      { href: "/food", labelKey: "nav.foodLog", icon: Apple },
      { href: "/food/plan", labelKey: "nav.mealPlan", icon: Sparkles },
      { href: "/pantry", labelKey: "nav.pantry", icon: ShoppingCart },
      { href: "/preferences", labelKey: "nav.preferences", icon: Apple },
    ],
  },
  {
    titleKey: "nav.sectionData",
    items: [
      { href: "/whoop", labelKey: "nav.whoop", icon: Heart },
      { href: "/profile", labelKey: "nav.profile", icon: User2 },
    ],
  },
];

export function Sidebar({ whoopEnabled = true }: { whoopEnabled?: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const sections = whoopEnabled
    ? SECTIONS
    : SECTIONS.map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => it.href !== "/whoop"),
      }));
  return (
    <aside className="hidden md:flex md:flex-col w-64 border-r border-[color:var(--border)] bg-[color:var(--black)] sticky top-0 h-dvh">
      <div className="p-6 border-b border-[color:var(--border)]">
        <div className="mono-label">LIFETRACKER / V1</div>
        <div className="font-display text-3xl mt-2">LifeOS</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {sections.map((sec) => (
          <div key={sec.titleKey}>
            <div className="mono-label px-3 mb-2">{t(sec.titleKey)}</div>
            <ul className="space-y-0.5">
              {sec.items.map((it) => {
                const active =
                  it.href === "/"
                    ? pathname === "/"
                    : pathname === it.href || pathname.startsWith(it.href + "/");
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 text-base transition",
                        active
                          ? "text-[color:var(--text-display)] bg-[color:var(--surface-raised)]"
                          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)]",
                      )}
                    >
                      <Icon size={16} strokeWidth={1.5} />
                      <span>{t(it.labelKey)}</span>
                      {active && (
                        <span className="ml-auto w-1 h-4 bg-[color:var(--accent)]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[color:var(--border)]">
        <div className="px-3 py-2">
          <ThemeToggle />
        </div>
        <form action="/api/auth/logout" method="post" className="p-3 border-t border-[color:var(--border)]">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 text-base text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] w-full"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span>{t("nav.signOut")}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
