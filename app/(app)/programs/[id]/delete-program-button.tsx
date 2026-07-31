"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function DeleteProgramButton({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const router = useRouter();
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doDelete() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/programs/${programId}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `http_${r.status}`);
      }
      router.push("/programs");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label={t("common.delete")}
      >
        <Trash2 size={14} strokeWidth={1.5} className="mr-2" />
        {t("prog.deleteButtonLabel")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
        {t("prog.deleteConfirmation")}
      </span>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        {t("common.cancel")}
      </Button>
      <Button variant="danger" size="sm" onClick={doDelete} disabled={busy}>
        {busy ? t("common.busy") : t("common.delete")}
      </Button>
      {err && (
        <span className="font-mono text-[13px] uppercase text-[color:var(--accent)]">
          {err}
        </span>
      )}
    </div>
  );
}
