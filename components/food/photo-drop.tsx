"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";

export function PhotoDrop({
  onUpload,
  onError,
  disabled,
}: {
  onUpload: (file: File) => Promise<void> | void;
  onError?: (msg: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handle(file: File | null | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <label
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(false);
        void handle(e.dataTransfer?.files?.[0]);
      }}
      className={`block border border-dashed dot-grid-subtle cursor-pointer p-6 text-center transition ${
        dragOver
          ? "border-[color:var(--accent)]"
          : "border-[color:var(--border-visible)] hover:border-[color:var(--text-display)]"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        type="file"
        accept="image/*,image/heic,image/heif"
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      <div className="space-y-2">
        <div className="mono-label">{t("photo.upload")}</div>
        <div className="font-mono text-[13px] text-[color:var(--text-disabled)]">
          {busy ? t("photo.compressing") : t("photo.tapCapture")}
        </div>
      </div>
    </label>
  );
}
