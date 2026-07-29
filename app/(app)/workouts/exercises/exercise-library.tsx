"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import {
  ExerciseDetailDrawer,
  type ExerciseDetail,
} from "@/components/workout/exercise-detail";

export function ExerciseLibrary({
  locale,
  rows,
}: {
  locale: "tr" | "en" | "zh";
  rows: ExerciseDetail[];
}) {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {rows.map((ex) => {
          const name = locale === "tr" ? ex.nameTr ?? ex.nameEn : ex.nameEn;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => setDetail(ex)}
              className="text-left"
            >
              <Card className="space-y-2 hover:border-[color:var(--text-display)] transition-colors">
                {ex.gifUrl ? (
                  <Image
                    src={ex.gifUrl}
                    alt={name}
                    width={300}
                    height={300}
                    className="w-full aspect-square object-cover border border-[color:var(--border)]"
                    unoptimized
                  />
                ) : (
                  <div className="aspect-square dot-grid-subtle border border-[color:var(--border)]" />
                )}
                <div>
                  <div className="font-display text-lg leading-tight">{name}</div>
                  <div className="mono-label mt-1">
                    {ex.target ?? ex.bodyPart ?? "—"} · {ex.equipment ?? "—"}
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <ExerciseDetailDrawer
        exercise={detail}
        open={detail !== null}
        onClose={() => setDetail(null)}
        locale={locale}
      />
    </>
  );
}
