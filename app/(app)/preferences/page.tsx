import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { foodPreferences } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { Card, CardLabel } from "@/components/ui/card";
import { PreferencesEditor } from "./preferences-editor";

export const dynamic = "force-dynamic";

const PREFERENCE_KINDS = ["liked", "disliked", "allergy"] as const;

export default async function PreferencesPage() {
  const { user } = await requireSession();
  const t = tFor(await getLocale());
  const prefs = await db
    .select()
    .from(foodPreferences)
    .where(eq(foodPreferences.userId, user.id));

  const labelMap: Record<string, string> = {
    liked: t("pref.liked"),
    disliked: t("pref.disliked"),
    allergy: t("pref.allergy"),
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("pref.tasteProfile")}</div>
        <h1 className="font-display text-5xl mt-1">{t("pref.title")}</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PREFERENCE_KINDS.map((kind) => (
          <Card key={kind}>
            <CardLabel>{labelMap[kind]}</CardLabel>
            <PreferencesEditor
              kind={kind}
              initial={prefs.filter((p) => p.kind === kind).map((p) => ({ id: p.id, label: p.label }))}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
