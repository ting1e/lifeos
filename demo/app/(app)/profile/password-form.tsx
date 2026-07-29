"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordForm() {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 6) {
      setMsg({ kind: "err", text: t("pwd.atLeast6") });
      return;
    }
    if (next !== confirm) {
      setMsg({ kind: "err", text: t("pwd.dontMatch") });
      return;
    }
    setBusy(true);
    // Demo: no real password storage. Just simulate success.
    await new Promise((r) => setTimeout(r, 300));
    setCurrent("");
    setNext("");
    setConfirm("");
    setMsg({ kind: "ok", text: t("pwd.demoNotChanged") });
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="mono-label mb-1">{t("pwd.current")}</div>
          <Input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("pwd.new")}</div>
          <Input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="mono-label mb-1">{t("pwd.confirm")}</div>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      {msg && (
        <div
          className={`font-mono text-[13px] uppercase tracking-[0.1em] ${
            msg.kind === "ok" ? "text-[color:var(--success)]" : "text-[color:var(--accent)]"
          }`}
        >
          → {msg.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !current || !next} variant="outline">
          {busy ? "..." : t("pwd.changePassword")}
        </Button>
      </div>
    </form>
  );
}
