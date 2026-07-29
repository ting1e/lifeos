import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[color:var(--surface)] border border-[color:var(--border)] p-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] mb-2",
        className,
      )}
      {...props}
    />
  );
}
