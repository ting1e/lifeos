import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/whoop/webhook",
  "/api/health/import",
  "/_next",
  "/favicon.ico",
  "/fonts",
  "/manifest.json",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = req.cookies.get("lt_sid");
  if (!cookie?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  // The sealed cookie is verified inside route handlers / server components via getSession().
  // Middleware only short-circuits unauth'd users without an Edge DB call.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon\\.ico|manifest\\.json).*)"],
};
