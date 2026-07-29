import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { BottomNav } from "@/components/nav/bottom-nav";
import { TopNav } from "@/components/nav/top-nav";
import { getLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession();
  const locale = await getLocale();
  const [p] = await db.select({ whoopEnabled: profile.whoopEnabled }).from(profile).where(eq(profile.userId, user.id)).limit(1);
  const whoopEnabled = p?.whoopEnabled ?? true;
  return (
    <LocaleProvider locale={locale}>
      <div className="min-h-dvh flex flex-col">
        <TopNav whoopEnabled={whoopEnabled} />
        <main className="flex-1 min-w-0 pb-24 md:pb-12">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
        </main>
        <BottomNav whoopEnabled={whoopEnabled} />
      </div>
    </LocaleProvider>
  );
}
