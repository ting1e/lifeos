import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { exercises } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { trCatalog } from "@/lib/i18n/exercise-zh";
import { ExerciseLibrary } from "./exercise-library";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; body_part?: string; page?: string }>;
}) {
  const { user } = await requireSession();
  const locale = await getLocale();
  const t = tFor(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const bodyPart = (sp.body_part ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await db
    .select()
    .from(exercises)
    .where(
      q || bodyPart
        ? sql`
            (${q ? sql`lower(name_en) like ${`%${q.toLowerCase()}%`}` : sql`true`})
            and (${bodyPart ? sql`body_part = ${bodyPart}` : sql`true`})
          `
        : undefined,
    )
    .orderBy(exercises.id)
    .offset(offset)
    .limit(PAGE_SIZE + 1);

  const hasNext = rows.length > PAGE_SIZE;
  const pageRows = hasNext ? rows.slice(0, PAGE_SIZE) : rows;

  function pageUrl(n: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (bodyPart) params.set("body_part", bodyPart);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/workouts/exercises?${qs}` : "/workouts/exercises";
  }

  const bodyParts = await db
    .select({ bodyPart: exercises.bodyPart })
    .from(exercises)
    .groupBy(exercises.bodyPart);

  return (
    <div className="space-y-6">
      <header>
        <div className="mono-label">{t("ex.library1324")}</div>
        <h1 className="font-display text-4xl mt-1">{t("ex.title")}</h1>
      </header>

      <form className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <div className="mono-label mb-1">{t("ex.search")}</div>
          <input
            name="q"
            defaultValue={q}
            placeholder="bench press, squat…"
            className="w-full bg-transparent border-b border-[color:var(--border-visible)] py-3 px-1 font-body text-lg text-[color:var(--text-display)] focus:outline-none focus:border-[color:var(--accent)]"
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("ex.bodyPart")}</div>
          <select
            name="body_part"
            defaultValue={bodyPart}
            className="bg-transparent border-b border-[color:var(--border-visible)] py-3 px-1 font-body text-lg text-[color:var(--text-display)]"
          >
            <option value="">{t("ex.all")}</option>
            {bodyParts
              .filter((b) => b.bodyPart)
              .map((b) => (
                <option key={b.bodyPart!} value={b.bodyPart!}>
                  {trCatalog("bodyPart", b.bodyPart, locale)}
                </option>
              ))}
          </select>
        </div>
        <button type="submit" className="btn btn--primary btn--sm">
          {t("ex.filter")}
        </button>
      </form>

      <ExerciseLibrary
        locale={locale}
        rows={pageRows.map((ex) => ({
          id: ex.id,
          nameEn: ex.nameEn,
          nameTr: ex.nameTr,
          nameZh: ex.nameZh,
          bodyPart: ex.bodyPart,
          equipment: ex.equipment,
          target: ex.target,
          muscleGroup: ex.muscleGroup,
          secondaryMuscles: (ex.secondaryMuscles as string[] | null) ?? null,
          instructionsEn: ex.instructionsEn,
          instructionsTr: ex.instructionsTr,
          instructionsZh: ex.instructionsZh,
          instructionStepsEn: (ex.instructionStepsEn as string[] | null) ?? null,
          instructionStepsTr: (ex.instructionStepsTr as string[] | null) ?? null,
          instructionStepsZh: (ex.instructionStepsZh as string[] | null) ?? null,
          imageUrl: ex.imageUrl,
          gifUrl: ex.gifUrl,
        }))}
      />

      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-between pt-2">
          {page > 1 ? (
            <Link href={pageUrl(page - 1)} className="btn btn--outline btn--sm">
              ← {t("common.prev")}
            </Link>
          ) : (
            <span />
          )}
          <span className="mono-label">{page}</span>
          {hasNext ? (
            <Link href={pageUrl(page + 1)} className="btn btn--outline btn--sm">
              {t("common.next")} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
