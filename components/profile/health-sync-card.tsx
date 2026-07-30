"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

type Status = {
  token: string | null;
  hasToken: boolean;
  syncUrl: string;
  lastSyncAt: string | null;
};

export function HealthSyncCard() {
  const t = useT();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const r = await fetch("/api/profile/health-sync");
    if (r.ok) setStatus(await r.json());
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function generate() {
    setBusy(true);
    try {
      await fetch("/api/profile/health-sync", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      await fetchStatus();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!confirm(t("health.confirmRevoke"))) return;
    setBusy(true);
    try {
      await fetch("/api/profile/health-sync", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      await fetchStatus();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  const fmtDate = (iso: string | null) => {
    if (!iso) return t("health.never");
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="space-y-3">
        <div>
          <div className="mono-label mb-1">{t("health.syncUrl")}</div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-[13px] break-all flex-1">
              {status.syncUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(status.syncUrl, "url")}
            >
              {copied === "url" ? t("health.copied") : t("health.copy")}
            </Button>
          </div>
        </div>

        <div>
          <div className="mono-label mb-1">{t("health.token")}</div>
          {status.hasToken ? (
            <div className="flex items-center gap-2">
              <code className="font-mono text-[13px] break-all flex-1 select-all text-[color:var(--text-secondary)]">
                {status.token}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy(status.token!, "token")}
              >
                {copied === "token" ? t("health.copied") : t("health.copy")}
              </Button>
            </div>
          ) : (
            <div className="font-mono text-[13px] text-[color:var(--text-disabled)]">
              {t("health.notGenerated")}
            </div>
          )}
        </div>

        <div>
          <div className="mono-label mb-1">{t("health.lastSync")}</div>
          <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">
            {fmtDate(status.lastSyncAt)}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {status.hasToken ? (
          <>
            <Button variant="outline" onClick={generate} disabled={busy}>
              {busy ? t("common.busy") : t("health.regenerate")}
            </Button>
            <Button variant="danger" onClick={revoke} disabled={busy}>
              {t("health.revoke")}
            </Button>
          </>
        ) : (
          <Button onClick={generate} disabled={busy}>
            {busy ? t("common.busy") : t("health.generate")}
          </Button>
        )}
      </div>

      <div className="font-mono text-[12px] text-[color:var(--text-disabled)]">
        {t("health.hint")}
      </div>
    </div>
  );
}
