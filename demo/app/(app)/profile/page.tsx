"use client";

import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/profile/language-switcher";
import { bmi, bmiCategory, bmr, recommendedKcal, tdee, macroSplit } from "@/lib/nutrition";
import { Card, CardLabel } from "@/components/ui/card";
import { MonoStat } from "@/components/nothing/mono-stat";
import { resolveDisplayName } from "@/lib/utils";

export default function ProfilePage() {
  const t = useT();
  const { state } = useDemoStore();
  const p = state.profile;
  const userEmail = "demo@lifeos.local";
  const name = resolveDisplayName({ displayName: p?.displayName, email: userEmail });

  const w = Number(p?.weightKg ?? 0);
  const h = Number(p?.heightCm ?? 0);
  const age = p?.age ?? 0;
  const sex = p?.sex ?? "m";
  const activity = p?.activityLevel ?? "moderate";
  const goal = p?.goal ?? "maintain";

  const b = w && h ? bmi(w, h) : 0;
  const bm = w && h && age ? bmr({ sex, weightKg: w, heightCm: h, age }) : 0;
  const formulaTd = bm ? tdee(bm, activity) : 0;
  // Demo: no real Whoop-measured TDEE — always falls back to formula
  const td = formulaTd;
  const target = td ? Math.round(recommendedKcal(td, goal)) : 0;
  const macros = w && target ? macroSplit(target, w, goal) : null;

  return (
    <div className="space-y-8">
      <header>
        <div className="mono-label">{t("prof.userProfile")}</div>
        <h1 className="font-display text-5xl mt-1">{name}</h1>
        <div className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] mt-1">
          {userEmail}
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <MonoStat label="BMI" value={b ? b.toFixed(1) : "—"} unit={b ? bmiCategory(b).slice(0, 4).toUpperCase() : undefined} />
        </Card>
        <Card>
          <MonoStat label="BMR" value={bm ? Math.round(bm) : "—"} unit="kcal" />
        </Card>
        <Card>
          <MonoStat
            label="TDEE · EST"
            value={td ? Math.round(td) : "—"}
            unit="kcal"
          />
        </Card>
        <Card>
          <MonoStat label="TARGET" value={target || "—"} unit="kcal" accent />
        </Card>
      </section>

      {macros && (
        <Card>
          <CardLabel>{t("prof.recommendedMacros")}</CardLabel>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <MonoStat label={t("food.protein")} value={macros.proteinG} unit="g" />
            <MonoStat label={t("food.carbs")} value={macros.carbsG} unit="g" />
            <MonoStat label={t("food.fat")} value={macros.fatG} unit="g" />
          </div>
        </Card>
      )}

      <Card>
        <CardLabel>{t("prof.edit")}</CardLabel>
        <ProfileForm initial={p} />
      </Card>

      <Card>
        <CardLabel>{t("prof.appearance")}</CardLabel>
        <div className="mt-2 -mx-3">
          <ThemeToggle />
        </div>
      </Card>

      <Card>
        <LanguageSwitcher />
      </Card>

      <Card>
        <CardLabel>{t("prof.security")}</CardLabel>
        <PasswordForm />
      </Card>
    </div>
  );
}
