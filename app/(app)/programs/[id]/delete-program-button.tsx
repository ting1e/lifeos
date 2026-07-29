"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteProgramButton({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const router = useRouter();
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
        aria-label={`delete ${programName}`}
      >
        <Trash2 size={14} strokeWidth={1.5} className="mr-2" />
        DELETE
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
        SURE?
      </span>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        CANCEL
      </Button>
      <Button variant="danger" size="sm" onClick={doDelete} disabled={busy}>
        {busy ? "DELETING…" : "YES, DELETE"}
      </Button>
      {err && (
        <span className="font-mono text-[13px] uppercase text-[color:var(--accent)]">
          {err}
        </span>
      )}
    </div>
  );
}
