import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { Card, CardLabel } from "@/components/ui/card";
import { AiProgramForm } from "./ai-program-form";
import { NewProgramForm } from "./new-program-form";

export default async function NewProgramPage() {
  await requireSession();
  const t = tFor(await getLocale());
  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("prog.create")}</div>
        <h1 className="font-display text-4xl mt-1">{t("prog.newProgram")}</h1>
      </header>

      <Card>
        <AiProgramForm />
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[color:var(--border)]" />
        <span className="mono-label">{t("prog.orManual")}</span>
        <div className="flex-1 h-px bg-[color:var(--border)]" />
      </div>

      <Card>
        <CardLabel>{t("prog.blankProgram")}</CardLabel>
        <NewProgramForm />
      </Card>
    </div>
  );
}
