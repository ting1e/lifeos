"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/client";

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

type Props = {
  selected: string; // YYYY-MM-DD
  today: string;    // YYYY-MM-DD
};

export function DayNav({ selected, today }: Props) {
  const router = useRouter();
  const t = useT();
  const prev = addDays(selected, -1);
  const next = addDays(selected, 1);
  const isToday = selected === today;
  const prevHref = `/?day=${prev}`;
  const nextHref = `/?day=${next}`;
  const todayHref = `/`;

  // Arrow keys: ← prev, → next (if not on today), T = today
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") router.push(prevHref);
      else if (e.key === "ArrowRight" && !isToday) router.push(nextHref);
      else if (e.key === "t" || e.key === "T") router.push(todayHref);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevHref, nextHref, todayHref, isToday]);

  const btn =
    "inline-flex items-center justify-center w-7 h-7 border border-[color:var(--border-visible)] text-[color:var(--text-secondary)] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)]";
  const today_btn =
    "inline-flex items-center justify-center px-2 h-7 border font-mono text-[12px] uppercase tracking-[0.08em]";

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Link href={prevHref} aria-label={t("common.prev")} className={btn} prefetch={false}>
        <ChevronLeft size={14} strokeWidth={1.75} />
      </Link>
      <Link
        href={todayHref}
        prefetch={false}
        className={`${today_btn} ${
          isToday
            ? "border-[color:var(--text-display)] text-[color:var(--text-display)]"
            : "border-[color:var(--border-visible)] text-[color:var(--text-secondary)] hover:border-[color:var(--text-display)] hover:text-[color:var(--text-display)]"
        }`}
        aria-current={isToday ? "page" : undefined}
      >
        {t("common.today")}
      </Link>
      {!isToday && (
        <Link href={nextHref} aria-label={t("common.next")} className={btn} prefetch={false}>
          <ChevronRight size={14} strokeWidth={1.75} />
        </Link>
      )}
    </div>
  );
}
