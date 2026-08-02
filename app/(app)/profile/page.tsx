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
import { NavSettingsCard } from "@/components/profile/nav-settings-card";
import { bmiCategory } from "@/lib/nutrition";
import { getKcalTargetsForUser } from "@/lib/nutrition/targets";
import { Card, CardLabel } from "@/components/ui/card";
import { MonoStat } from "@/components/nothing/mono-stat";
import { resolveDisplayName } from "@/lib/utils";
import { getLocale, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user } = await requireSession();
  const [p] = await db.select().from(profile).where(eq(profile.userId, user.id)).limit(1);
  const name = resolveDisplayName({ displayName: p?.displayName, username: user.username });
  const currentLocale = await getLocale();
  const t = tFor(currentLocale);

  const whoopEnabled = p?.whoopEnabled ?? true;
  const kcal = await getKcalTargetsForUser(user.id);
  const b = kcal.bmi;
  const bm = kcal.bmr;
  const td = kcal.computedTdee;
  const tdeeSource = kcal.tdeeSource;
  const measuredSamples = kcal.measuredSamples;
  const target = kcal.kcalTarget;
  const macros = kcal.macroTargets;

  return (
    <div className="space-y-8">
      <header>
        <div className="mono-label">{t("prof.userProfile")}</div>
        <h1 className="font-display text-4xl mt-1">{name}</h1>
        <div className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] mt-1">
          {user.username}
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
                ? t("dash.tdeeWhoopN", { n: measuredSamples ?? 0 })
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
        <CardLabel>{t("nav.settingsTitle")}</CardLabel>
        <NavSettingsCard
          initialHidden={Array.isArray(p?.navSettings) ? (p!.navSettings as string[]) : []}
          whoopEnabled={whoopEnabled}
        />
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
