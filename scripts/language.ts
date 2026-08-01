export type Lang = "en" | "tr" | "zh";

export function resolveLanguage(): Lang {
  const v = (process.env.LANGUAGE ?? "").trim().toLowerCase();
  if (v.startsWith("zh")) return "zh";
  if (v.startsWith("tr")) return "tr";
  if (v.startsWith("en")) return "en";
  return "zh";
}
