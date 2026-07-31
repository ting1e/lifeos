import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKg(v: number | string | null | undefined, digits = 1): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function formatInt(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return Math.round(n).toString();
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((+a - +b) / 86_400_000);
}

// Derive a friendly display name. Prefer the explicit `displayName`, else
// title-case the username ("john.doe" → "John Doe").
export function resolveDisplayName(args: {
  displayName?: string | null;
  username: string;
}): string {
  const explicit = args.displayName?.trim();
  if (explicit) return explicit;
  return args.username
    .split(/[._\-+]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function bcp47For(locale: "tr" | "en" | "zh"): string {
  if (locale === "tr") return "tr-TR";
  if (locale === "zh") return "zh-CN";
  return "en-US";
}

export function greetingFor(
  locale: "tr" | "en" | "zh",
  name: string,
  date = new Date(),
): string {
  const hour = date.getHours();
  if (locale === "tr") {
    if (hour < 6) return `İyi geceler, ${name}`;
    if (hour < 12) return `Günaydın, ${name}`;
    if (hour < 18) return `Merhaba, ${name}`;
    return `İyi akşamlar, ${name}`;
  }
  if (locale === "zh") {
    if (hour < 6) return `夜深了，${name}`;
    if (hour < 12) return `早上好，${name}`;
    if (hour < 18) return `下午好，${name}`;
    return `晚上好，${name}`;
  }
  if (hour < 6) return `Good night, ${name}`;
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Hello, ${name}`;
  return `Good evening, ${name}`;
}
