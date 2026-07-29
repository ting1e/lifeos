import Link from "next/link";
import { eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { programs } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const { user } = await requireSession();
  const t = tFor(await getLocale());
  const rows = await db
    .select()
    .from(programs)
    .where(or(eq(programs.userId, user.id), isNull(programs.userId)));

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="mono-label">{t("prog.training")}</div>
          <h1 className="font-display text-5xl mt-1">{t("prog.title")}</h1>
        </div>
        <Link href="/programs/new">
          <Button>{t("work.new")}</Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.length === 0 && (
          <Card>
            <div className="font-mono text-base text-[color:var(--text-secondary)]">
              {t("prog.noProgramsYet")}
            </div>
          </Card>
        )}
        {rows.map((p) => (
          <Link key={p.id} href={`/programs/${p.id}`}>
            <Card className="hover:border-[color:var(--text-display)] transition">
              <div className="mono-label">{p.isTemplate ? t("prog.template") : t("prog.custom")}</div>
              <div className="font-display text-3xl mt-1">{p.name}</div>
              {p.description && (
                <div className="font-mono text-base text-[color:var(--text-secondary)] mt-2 line-clamp-3">
                  {p.description}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
