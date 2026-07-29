import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";

export const runtime = "nodejs";

const Body = z.object({
  whoopEnabled: z.boolean(),
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
      whoopEnabled: parsed.data.whoopEnabled,
    })
    .onConflictDoUpdate({
      target: profile.userId,
      set: {
        whoopEnabled: parsed.data.whoopEnabled,
      },
    });
  return NextResponse.json({ ok: true });
}
