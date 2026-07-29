"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function WhoopToggle({ enabled }: { enabled: boolean }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch("/api/profile/whoop-enabled", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ whoopEnabled: !enabled }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mt-2">
        <p className="font-body text-base text-[color:var(--text-secondary)]">
          {t("prof.whoopEnabledHint")}
        </p>
        <Button variant={enabled ? "outline" : "primary"} onClick={toggle} disabled={busy}>
          {busy ? t("common.busy") : enabled ? t("common.disable") : t("common.enable")}
        </Button>
      </div>
      {!enabled && (
        <div className="font-mono text-[12px] text-[color:var(--text-disabled)] mt-2">
          {t("whoop.disabledMsg")}
        </div>
      )}
    </div>
  );
}
