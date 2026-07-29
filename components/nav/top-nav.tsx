"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";

type Item = { href: string; labelKey: DictKey };

const NAV: Item[] = [
  { href: "/", labelKey: "nav.dashboard" },
  { href: "/workouts", labelKey: "nav.workouts" },
  { href: "/programs", labelKey: "nav.programs" },
  { href: "/food", labelKey: "nav.food" },
  { href: "/food/plan", labelKey: "nav.mealPlan" },
  { href: "/pantry", labelKey: "nav.pantry" },
  { href: "/whoop", labelKey: "nav.whoop" },
  { href: "/analysis", labelKey: "nav.analysis" },
  { href: "/profile", labelKey: "nav.profile" },
];

function pickActive(pathname: string, nav: Item[]): string | null {
  // Longest matching href wins so /food/plan activates "Meal Plan", not "Food".
  let best: string | null = null;
  for (const it of nav) {
    const match =
      it.href === "/"
        ? pathname === "/"
        : pathname === it.href || pathname.startsWith(it.href + "/");
    if (!match) continue;
    if (!best || it.href.length > best.length) best = it.href;
  }
  return best;
}

export function TopNav({ whoopEnabled = true }: { whoopEnabled?: boolean }) {
  const pathname = usePathname();
  const nav = whoopEnabled ? NAV : NAV.filter((it) => it.href !== "/whoop");
  const active = pickActive(pathname, nav);
  const t = useT();

  return (
    <header className="hidden md:block sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--black)]/95 backdrop-blur safe-top">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center gap-10 h-14">
          <Link
            href="/"
            className="font-display text-3xl text-[color:var(--text-display)] leading-none shrink-0"
            aria-label="LifeOS — home"
          >
            LifeOS
          </Link>

          <nav className="flex-1 min-w-0">
            <ul className="flex items-center gap-1">
              {nav.map((it) => {
                const isActive = active === it.href;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative inline-flex items-center px-3 h-14 font-body text-[13px] whitespace-nowrap transition-colors",
                        isActive
                          ? "text-[color:var(--text-display)]"
                          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-display)]",
                      )}
                    >
                      {t(it.labelKey)}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-3 right-3 bottom-0 h-px transition-colors",
                          isActive ? "bg-[color:var(--accent)]" : "bg-transparent",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                aria-label={t("nav.signOut")}
                title={t("nav.signOut")}
                className="inline-flex items-center justify-center w-10 h-10 text-[color:var(--text-secondary)] hover:text-[color:var(--accent)] transition-colors"
              >
                <LogOut size={16} strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
