"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n/client";

export function DataIoCard() {
  const t = useT();
  const confirm = useConfirm();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const r = await fetch("/api/export");
      if (!r.ok) throw new Error("export failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = r.headers.get("content-disposition") ?? "";
      a.download = cd.match(/filename="(.+)"/)?.[1] ?? "lifeos-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    if (mode === "replace" && !(await confirm({ message: t("data.confirmReplace"), danger: true }))) return;

    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const r = await fetch(`/api/import?mode=${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: text,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "import failed");

      const imported = data.imported as Record<string, number | boolean>;
      const parts: string[] = [];
      if (imported.profile) parts.push("profile");
      for (const [key, val] of Object.entries(imported)) {
        if (key === "profile") continue;
        if (typeof val === "number" && val > 0) parts.push(`${val} ${key}`);
      }
      setResult(parts.join(", ") || "OK");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="space-y-2">
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? t("data.exporting") : t("data.export")}
        </Button>
        <div className="font-mono text-[12px] text-[color:var(--text-disabled)]">
          {t("data.exportHint")}
        </div>
      </div>

      <div className="border-t border-[color:var(--border)] pt-4 space-y-3">
        <div className="flex gap-2">
          <Button
            variant={mode === "merge" ? "primary" : "outline"}
            size="sm"
            onClick={() => setMode("merge")}
          >
            {t("data.merge")}
          </Button>
          <Button
            variant={mode === "replace" ? "danger" : "outline"}
            size="sm"
            onClick={() => setMode("replace")}
          >
            {t("data.replace")}
          </Button>
        </div>
        <div className="font-mono text-[12px] text-[color:var(--text-disabled)]">
          {mode === "merge" ? t("data.mergeHint") : t("data.replaceHint")}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={importing}
          >
            {t("data.selectFile")}
          </Button>
          <span className="font-mono text-[13px] text-[color:var(--text-secondary)] truncate">
            {file ? file.name : t("data.noFile")}
          </span>
        </div>

        <Button onClick={handleImport} disabled={importing || !file}>
          {importing ? t("data.importing") : t("data.import")}
        </Button>

        {result && (
          <div className="font-mono text-[13px] text-[color:var(--text-secondary)]">
            {t("data.imported", { summary: result })}
          </div>
        )}
        {error && (
          <div className="font-mono text-[13px] text-[color:var(--danger)]">
            {t("data.importFailed", { error })}
          </div>
        )}
      </div>
    </div>
  );
}
