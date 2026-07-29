import { eq, or, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { programs } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { Card, CardLabel } from "@/components/ui/card";
import { NewWorkoutForm } from "./new-workout-form";
import { todayKey } from "@/lib/utils/day";
import { getLocale, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { user } = await requireSession();
  const t = tFor(await getLocale());
  const sp = await searchParams;
  const progs = await db
    .select()
    .from(programs)
    .where(or(eq(programs.userId, user.id), isNull(programs.userId)));
  const initialDate =
    sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : todayKey();

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("work.newSession")}</div>
        <h1 className="font-display text-5xl mt-1">{t("work.startWorkoutTitle")}</h1>
      </header>
      <Card>
        <CardLabel>{t("work.programLabel")}</CardLabel>
        <NewWorkoutForm programs={progs} initialDate={initialDate} />
      </Card>
    </div>
  );
}
