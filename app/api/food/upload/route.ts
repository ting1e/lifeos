import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { writeUpload } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await requireSession();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const rawExt = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  // browser-image-compression names output files "*.blob" — the content is a
  // compressed image (usually jpeg), so normalize it to a renderable extension.
  const ext = rawExt === "blob" ? "jpg" : rawExt;
  const buf = Buffer.from(await file.arrayBuffer());
  const name = await writeUpload(buf, ext || "jpg");
  return NextResponse.json({ name });
}
