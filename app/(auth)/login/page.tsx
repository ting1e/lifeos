import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getLocale, tFor } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");
  const t = tFor(await getLocale());

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 dot-grid-subtle bg-[color:var(--black)]">
      <div className="w-full max-w-sm">
        <div className="mb-12">
          <div className="font-mono text-[13px] tracking-[0.12em] uppercase text-[color:var(--text-secondary)] mb-2">
            {t("auth.appVersion")}
          </div>
          <h1 className="font-display text-5xl tracking-tight text-[color:var(--text-display)]">
            {t("auth.signIn")}
          </h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
