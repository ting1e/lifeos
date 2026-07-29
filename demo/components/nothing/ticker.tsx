import { cn } from "@/lib/utils";

export function Ticker({
  items,
  className,
  bare = false,
}: {
  items: { label: string; value: string }[];
  className?: string;
  // When true, drops the bottom border + edge bleed so the caller can own
  // the surrounding chrome (e.g. share a divider with a sibling like DayNav).
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-6 overflow-x-auto scrollbar-hide",
        bare ? "py-0 px-0" : "py-2 px-1 border-b border-[color:var(--border)] -mx-4 px-4",
        className,
      )}
    >
      {items.map((it, i) => (
        <div key={i} className="flex-shrink-0 flex items-baseline gap-2">
          <span className="mono-label">{it.label}</span>
          <span className="font-mono text-base text-[color:var(--text-display)] tabular-nums">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
