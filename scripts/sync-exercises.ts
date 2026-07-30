// Sync the local exercise database against hasaneyldrm/exercises-dataset.
//
// - Mirrors `images/` and `videos/` (~135 MB) into `public/exercises/` so the
//   GIFs/JPGs are served from our own host instead of raw.githubusercontent.com.
// - Upserts every row in the exercises table with the local paths plus the
//   structured instruction_steps arrays.
// - Idempotent: re-running only downloads files that are missing locally.
//
// Usage:
//   pnpm tsx scripts/sync-exercises.ts
//
// Optional env:
//   EXERCISES_DATASET_DIR=/path/to/local/clone  (skip HTTP, copy from clone)
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { exercises } from "../lib/db/schema";

if (process.env.HTTPS_PROXY) {
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY));
}

const DATASET_RAW =
  process.env.EXERCISES_DATASET_BASE ??
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main";

type DatasetRow = {
  id: string;
  name: string;
  category?: string;
  body_part?: string;
  equipment?: string;
  target?: string;
  muscle_group?: string;
  secondary_muscles?: string[];
  instructions?: { en?: string; tr?: string; zh?: string };
  instruction_steps?: { en?: string[]; tr?: string[]; zh?: string[] };
  image?: string;
  gif_url?: string;
};

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public", "exercises");
const IMG_DIR = path.join(PUBLIC_DIR, "images");
const VID_DIR = path.join(PUBLIC_DIR, "videos");
const LOCAL_CLONE = process.env.EXERCISES_DATASET_DIR
  ? path.resolve(process.env.EXERCISES_DATASET_DIR)
  : null;

async function ensureDir(dir: string) {
  await fsp.mkdir(dir, { recursive: true });
}

async function fetchJson(): Promise<DatasetRow[]> {
  // Prefer a local clone (much faster); fall back to GitHub raw.
  if (LOCAL_CLONE) {
    const file = path.join(LOCAL_CLONE, "data", "exercises.json");
    const buf = await fsp.readFile(file, "utf-8");
    return JSON.parse(buf) as DatasetRow[];
  }
  const url = `${DATASET_RAW}/data/exercises.json`;
  console.log(`→ fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return (await res.json()) as DatasetRow[];
}

async function copyOrDownload(rel: string, destAbs: string): Promise<boolean> {
  // Returns true when the file was newly written, false when it was already
  // present locally.
  if (
    fs.existsSync(destAbs) &&
    (await fsp.stat(destAbs)).size > 0
  ) {
    return false;
  }
  if (LOCAL_CLONE) {
    const src = path.join(LOCAL_CLONE, rel);
    if (!fs.existsSync(src)) {
      throw new Error(`missing in clone: ${src}`);
    }
    await fsp.copyFile(src, destAbs);
    return true;
  }
  const url = `${DATASET_RAW}/${rel}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.writeFile(destAbs, buf);
  return true;
}

function localPath(rel: string | undefined): string | null {
  if (!rel) return null;
  // Dataset stores "images/0001-xxx.jpg" or "videos/0001-xxx.gif"
  const clean = rel.replace(/^\/+/, "");
  return `/exercises/${clean}`;
}

async function pmap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  await ensureDir(IMG_DIR);
  await ensureDir(VID_DIR);

  const rows = await fetchJson();
  console.log(`→ ${rows.length} exercises in dataset`);

  // -------- Mirror media files --------
  const mediaJobs: { rel: string; abs: string }[] = [];
  for (const r of rows) {
    if (r.image) {
      mediaJobs.push({
        rel: r.image,
        abs: path.join(ROOT, "public", "exercises", r.image),
      });
    }
    if (r.gif_url) {
      mediaJobs.push({
        rel: r.gif_url,
        abs: path.join(ROOT, "public", "exercises", r.gif_url),
      });
    }
  }
  console.log(`→ syncing ${mediaJobs.length} media files…`);

  let downloaded = 0;
  let kept = 0;
  let failed = 0;
  await pmap(mediaJobs, 16, async (j) => {
    try {
      const wrote = await copyOrDownload(j.rel, j.abs);
      if (wrote) downloaded++;
      else kept++;
      if ((downloaded + kept) % 200 === 0) {
        process.stdout.write(
          `  · ${downloaded + kept}/${mediaJobs.length}\n`,
        );
      }
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${j.rel}: ${e instanceof Error ? e.message : e}`);
    }
  });
  console.log(
    `✓ media synced — downloaded ${downloaded}, kept ${kept}, failed ${failed}`,
  );

  // -------- Upsert DB rows --------
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  console.log("→ upserting exercise rows…");
  // Per-row upsert so each row gets its own values applied on conflict
  // (drizzle's bulk `.onConflictDoUpdate` would otherwise share one `set`).
  let done = 0;
  for (const r of rows) {
    const nameEn = (r.name ?? "").toString();
    const values = {
      id: r.id,
      nameEn,
      nameTr: nameEn,
      nameZh: null, // populated by pnpm apply:zh
      category: r.category ?? null,
      bodyPart: r.body_part ?? null,
      equipment: r.equipment ?? null,
      target: r.target ?? null,
      muscleGroup: r.muscle_group ?? null,
      secondaryMuscles: r.secondary_muscles ?? [],
      instructionsEn: r.instructions?.en ?? null,
      instructionsTr: r.instructions?.tr ?? null,
      instructionsZh: r.instructions?.zh ?? null,
      instructionStepsEn: r.instruction_steps?.en ?? [],
      instructionStepsTr: r.instruction_steps?.tr ?? [],
      instructionStepsZh: r.instruction_steps?.zh ?? [],
      imageUrl: localPath(r.image),
      gifUrl: localPath(r.gif_url),
    };
    await db
      .insert(exercises)
      .values(values)
      .onConflictDoUpdate({
        target: exercises.id,
        set: {
          nameEn: values.nameEn,
          nameTr: values.nameTr,
          category: values.category,
          bodyPart: values.bodyPart,
          equipment: values.equipment,
          target: values.target,
          muscleGroup: values.muscleGroup,
          secondaryMuscles: values.secondaryMuscles,
          instructionsEn: values.instructionsEn,
          instructionsTr: values.instructionsTr,
          instructionsZh: values.instructionsZh,
          instructionStepsEn: values.instructionStepsEn,
          instructionStepsTr: values.instructionStepsTr,
          instructionStepsZh: values.instructionStepsZh,
          imageUrl: values.imageUrl,
          gifUrl: values.gifUrl,
        },
      });
    done++;
    if (done % 200 === 0) {
      process.stdout.write(`  · ${done}/${rows.length}\n`);
    }
  }

  console.log(`✓ ${rows.length} exercises upserted`);
  await pool.end();
}

main().catch((e) => {
  console.error("sync failed:", e);
  process.exit(1);
});
