"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Hand } from "lucide-react";
import { useT } from "@/lib/i18n/client";

type Row = { idiom: string; equiv: string; example: string };

const ROWS: Row[] = [
  { idiom: "1 avuç içi", equiv: "~100–150 g", example: "tavuk göğsü, somon, kırmızı et" },
  { idiom: "1 yumruk", equiv: "~150–200 g", example: "pişmiş pirinç, makarna, meyve" },
  { idiom: "Sıkılı yumruk ön tarafı", equiv: "~½ bardak", example: "yulaf, lapa, sebze" },
  { idiom: "Sıkılı yumruk iç tarafı", equiv: "~1 bardak", example: "süt, ayran, çorba" },
  { idiom: "1 baş parmak ucu", equiv: "~½ yemek kaşığı (~7 g)", example: "fıstık ezmesi, zeytinyağı, peynir" },
  { idiom: "1 işaret parmak ucu", equiv: "~1 çay kaşığı (~5 g)", example: "tereyağı, bal, reçel" },
  { idiom: "1 kibrit kutusu", equiv: "~30 g", example: "beyaz peynir, kaşar" },
  { idiom: "1 avuç dolusu", equiv: "~30 g", example: "fındık, badem, ceviz" },
  { idiom: "1 dilim ekmek", equiv: "~25–35 g", example: "köy ekmeği, kepekli, tam buğday" },
  { idiom: "1 orta boy yumurta", equiv: "~50 g", example: "haşlanmış, omlet, menemen" },
];

export function HandMeasureLegend() {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <div className="border border-[color:var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[color:var(--border)] focus:outline-none"
      >
        <span className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)]">
          <Hand size={12} strokeWidth={1.75} />
          {t("plan.handMeasureTitle")}
        </span>
        {open ? (
          <ChevronUp size={14} strokeWidth={1.5} className="text-[color:var(--text-secondary)]" />
        ) : (
          <ChevronDown size={14} strokeWidth={1.5} className="text-[color:var(--text-secondary)]" />
        )}
      </button>
      {open && (
        <div className="border-t border-[color:var(--border)] px-3 py-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            {ROWS.map((r) => (
              <div
                key={r.idiom}
                className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3 py-1 border-b border-[color:var(--border)] last:border-b-0"
              >
                <div>
                  <div className="font-body text-base text-[color:var(--text-display)]">{r.idiom}</div>
                  <div className="font-mono text-[12px] text-[color:var(--text-disabled)]">
                    {r.example}
                  </div>
                </div>
                <div className="font-mono text-[13px] uppercase tracking-[0.06em] text-[color:var(--accent)] self-center text-right tabular-nums">
                  {r.equiv}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
