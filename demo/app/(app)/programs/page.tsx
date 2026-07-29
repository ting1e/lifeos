"use client";

import Link from "next/link";
import { useDemoStore } from "@/lib/demo/store";
import { useT } from "@/lib/i18n/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProgramsPage() {
  const t = useT();
  const { state } = useDemoStore();
  const rows = state.programs;

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="mono-label">{t("prog.training")}</div>
          <h1 className="font-display text-5xl mt-1">{t("prog.title")}</h1>
        </div>
        <Link href="/programs/new">
          <Button>{t("prog.new")}</Button>
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
