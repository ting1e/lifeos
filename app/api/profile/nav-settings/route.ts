import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";

export const runtime = "nodejs";

const Body = z.object({
  hidden: z.array(z.string()).max(20),
});

export async function PATCH(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  await db
    .insert(profile)
    .values({
      userId: user.id,
      navSettings: parsed.data.hidden,
    })
    .onConflictDoUpdate({
      target: profile.userId,
      set: {
        navSettings: parsed.data.hidden,
      },
    });
  return NextResponse.json({ ok: true });
}
