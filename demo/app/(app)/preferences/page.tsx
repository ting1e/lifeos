"use client";

import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Card, CardLabel } from "@/components/ui/card";
import { PreferencesEditor } from "./preferences-editor";

const PREFERENCE_KINDS = ["liked", "disliked", "allergy"] as const;

export default function PreferencesPage() {
  const t = useT();
  const { state } = useDemoStore();
  const prefs = state.foodPreferences;

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
