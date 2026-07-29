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
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const buf = Buffer.from(await file.arrayBuffer());
  const name = await writeUpload(buf, ext || "jpg");
  return NextResponse.json({ name });
}
