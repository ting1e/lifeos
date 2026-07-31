import path from "node:path";
import fs from "node:fs/promises";
import { requireSession } from "@/lib/auth/session";
import { uploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  await requireSession();
  const { name } = await ctx.params;
  const safeName = path.basename(name);
  const full = uploadPath(safeName);
  const ext = (safeName.split(".").pop() ?? "").toLowerCase();
  // Legacy files saved by browser-image-compression carry a ".blob" extension
  // but contain a compressed image (usually jpeg).
  const mime = ext === "blob" ? "image/jpeg" : (MIME_BY_EXT[ext] ?? "application/octet-stream");

  try {
    const buf = await fs.readFile(full);
    return new Response(buf, {
      headers: {
        "content-type": mime,
        "cache-control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("not_found", { status: 404 });
  }
}
