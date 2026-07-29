"use client";

import { useT } from "@/lib/i18n/client";
import { Card, CardLabel } from "@/components/ui/card";
import { AiProgramForm } from "./ai-program-form";
import { NewProgramForm } from "./new-program-form";

export default function NewProgramPage() {
  const t = useT();

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("prog.create")}</div>
        <h1 className="font-display text-5xl mt-1">{t("prog.createPageTitle")}</h1>
      </header>

      <Card>
        <AiProgramForm />
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[color:var(--border)]" />
        <span className="mono-label">{t("prog.orManualSeparator")}</span>
        <div className="flex-1 h-px bg-[color:var(--border)]" />
      </div>

      <Card>
        <CardLabel>{t("prog.blankProgramLabel")}</CardLabel>
        <NewProgramForm />
      </Card>
    </div>
  );
}
