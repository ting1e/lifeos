import { getLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
