"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Apple, Heart, LayoutDashboard, User2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { useDemoStore } from "@/lib/demo/store";
import type { DictKey } from "@/lib/i18n/dict";

type Item = { href: string; labelKey: DictKey; icon: typeof Activity };

const ITEMS: Item[] = [
  { href: "/", labelKey: "nav.dashShort", icon: LayoutDashboard },
  { href: "/workouts", labelKey: "nav.trainShort", icon: Activity },
  { href: "/food", labelKey: "nav.foodShort", icon: Apple },
  { href: "/whoop", labelKey: "nav.whoopShort", icon: Heart },
  { href: "/profile", labelKey: "nav.meShort", icon: User2 },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const { state } = useDemoStore();
  const whoopEnabled = state.whoopEnabled;
  const items = whoopEnabled ? ITEMS : ITEMS.filter((it) => it.href !== "/whoop");
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[color:var(--black)] border-t border-[color:var(--border)] safe-bottom z-50">
      <div className={`grid ${whoopEnabled ? "grid-cols-5" : "grid-cols-4"}`}>
        {items.map((it) => {
          const active =
            it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition",
                active
                  ? "text-[color:var(--text-display)]"
                  : "text-[color:var(--text-secondary)]",
              )}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="font-mono text-[12px] tracking-[0.08em]">{t(it.labelKey)}</span>
              {active && (
                <span className="absolute top-0 h-[2px] w-8 bg-[color:var(--text-display)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
