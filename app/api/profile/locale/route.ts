import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";

const Body = z.object({
  locale: z.enum(["en", "tr", "zh"]),
});

export async function PATCH(req: Request) {
  const { user } = await requireSession();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  await db
    .update(users)
    .set({ locale: parsed.data.locale })
    .where(eq(users.id, user.id));
  // Mirror the choice into a cookie so anonymous pages (no session, e.g.
  // the login screen) can still render in the user's preferred locale.
  (await cookies()).set("locale", parsed.data.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true });
}
