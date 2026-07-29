"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { useT } from "@/lib/i18n/client";

export function PhotoDrop({
  onUpload,
  disabled,
}: {
  onUpload: (file: File) => Promise<void> | void;
  disabled?: boolean;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const f = files[0];
      const compressed = await imageCompression(f, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      setPreview(URL.createObjectURL(compressed));
      await onUpload(compressed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label
      className={`block border border-dashed border-[color:var(--border-visible)] dot-grid-subtle cursor-pointer p-6 text-center transition hover:border-[color:var(--text-display)] ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => handle(e.target.files)}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="mx-auto max-h-48 object-contain" />
      ) : (
        <div className="space-y-2">
          <div className="mono-label">{t("photo.upload")}</div>
          <div className="font-mono text-[13px] text-[color:var(--text-disabled)]">
            {busy ? t("photo.compressing") : t("photo.tapCapture")}
          </div>
        </div>
      )}
    </label>
  );
}
