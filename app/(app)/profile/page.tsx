import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { WhoopToggle } from "./whoop-toggle";
import { HealthSyncCard } from "@/components/profile/health-sync-card";
import { DataIoCard } from "@/components/profile/data-io-card";
import { AiConfigForm } from "./ai-config-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/profile/language-switcher";
import { bmi, bmiCategory, bmr, recommendedKcal, tdee, macroSplit } from "@/lib/nutrition";
import { getMeasuredTdee } from "@/lib/whoop/tdee";
import { Card, CardLabel } from "@/components/ui/card";
import { MonoStat } from "@/components/nothing/mono-stat";
import { resolveDisplayName } from "@/lib/utils";
import { getLocale, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user } = await requireSession();
  const [p] = await db.select().from(profile).where(eq(profile.userId, user.id)).limit(1);
  const name = resolveDisplayName({ displayName: p?.displayName, email: user.email });
  const currentLocale = await getLocale();
  const t = tFor(currentLocale);

  const w = Number(p?.weightKg ?? 0);
  const h = Number(p?.heightCm ?? 0);
  const age = p?.age ?? 0;
  const sex = p?.sex ?? "m";
  const activity = p?.activityLevel ?? "moderate";
  const goal = p?.goal ?? "maintain";

  const b = w && h ? bmi(w, h) : 0;
  const bm = w && h && age ? bmr({ sex, weightKg: w, heightCm: h, age }) : 0;
  const formulaTd = bm ? tdee(bm, activity) : 0;
  const whoopEnabled = p?.whoopEnabled ?? true;
  const measured = whoopEnabled ? await getMeasuredTdee(user.id) : null;
  const td = measured?.kcal ?? formulaTd;
  const tdeeSource: "whoop" | "formula" = measured ? "whoop" : "formula";
  const target = td ? Math.round(recommendedKcal(td, goal)) : 0;
  const macros = w && target ? macroSplit(target, w, goal) : null;

  return (
    <div className="space-y-8">
      <header>
        <div className="mono-label">{t("prof.userProfile")}</div>
        <h1 className="font-display text-4xl mt-1">{name}</h1>
        <div className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] mt-1">
          {user.email}
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <MonoStat label={t("dash.bmi")} value={b ? b.toFixed(1) : "—"} unit={b ? bmiCategory(b).slice(0, 4).toUpperCase() : undefined} />
        </Card>
        <Card>
          <MonoStat label={t("prof.bmr")} value={bm ? Math.round(bm) : "—"} unit={t("food.kcal")} />
        </Card>
        <Card>
          <MonoStat
            label={
              tdeeSource === "whoop"
                ? t("dash.tdeeWhoopN", { n: measured!.samples })
                : t("dash.tdeeEst")
            }
            value={td ? Math.round(td) : "—"}
            unit={t("food.kcal")}
          />
        </Card>
        <Card>
          <MonoStat label={t("dash.target")} value={target || "—"} unit={t("food.kcal")} accent />
        </Card>
      </section>

      {macros && (
        <Card>
          <CardLabel>{t("prof.recommendedMacros")}</CardLabel>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <MonoStat label={t("dash.protein")} value={macros.proteinG} unit="g" />
            <MonoStat label={t("dash.carbs")} value={macros.carbsG} unit="g" />
            <MonoStat label={t("dash.fat")} value={macros.fatG} unit="g" />
          </div>
        </Card>
      )}

      <Card>
        <CardLabel>{t("prof.edit")}</CardLabel>
        <ProfileForm initial={p} />
      </Card>

      <Card>
        <CardLabel>{t("prof.aiIntegration")}</CardLabel>
        <AiConfigForm
          initial={{
            baseUrl: p?.aiBaseUrl ?? "",
            textModel: p?.aiTextModel ?? "",
            imageModel: p?.aiImageModel ?? "",
            audioModel: p?.aiAudioModel ?? "",
            apiKeyMasked: p?.aiApiKey ? `••••${p.aiApiKey.slice(-4)}` : "",
            hasKey: !!p?.aiApiKey,
          }}
        />
      </Card>

      <Card>
        <CardLabel>{t("health.title")}</CardLabel>
        <HealthSyncCard />
      </Card>

      <Card>
        <CardLabel>{t("data.title")}</CardLabel>
        <DataIoCard />
      </Card>

      <Card>
        <CardLabel>{t("prof.appearance")}</CardLabel>
        <div className="mt-2 -mx-3">
          <ThemeToggle />
        </div>
      </Card>

      <Card>
        <CardLabel>{t("prof.whoopIntegration")}</CardLabel>
        <WhoopToggle enabled={whoopEnabled} />
      </Card>

      <Card>
        <LanguageSwitcher initialLocale={currentLocale} />
      </Card>

      <Card>
        <CardLabel>{t("prof.security")}</CardLabel>
        <PasswordForm />
      </Card>
    </div>
  );
}
