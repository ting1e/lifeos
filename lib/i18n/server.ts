import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { translate, type DictKey, type Locale } from "./dict";

const LOCALE_VALID = new Set<Locale>(["en", "tr", "zh"]);

function isValidLocale(v: unknown): v is Locale {
  return typeof v === "string" && LOCALE_VALID.has(v as Locale);
}

// Reads the signed-in user's saved locale from the session-bound user row.
// For anonymous pages (no session) falls back to the "locale" cookie set by
// the locale PATCH route, then to "en" for any unexpected value.
export async function getLocale(): Promise<Locale> {
  const sess = await getSession().catch(() => null);
  const v = sess?.user.locale;
  if (isValidLocale(v)) return v;
  const cv = (await cookies()).get("locale")?.value;
  if (isValidLocale(cv)) return cv;
  return "en";
}

// Bound translator — call once per server component, then `t("nav.home")`.
export function tFor(locale: Locale) {
  return (key: DictKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
}
