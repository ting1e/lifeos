"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { useT } from "@/lib/i18n/client";

const HEIC_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

function isHeic(file: File): boolean {
  return HEIC_TYPES.includes(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  const { heicTo } = await import("heic-to");

  try {
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.85 });
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    // Fallback: createImageBitmap (Safari, Chrome with OS HEIC codec)
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      if (blob) return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    } catch {
      // fall through
    }
  }

  throw new Error("heic_conversion_failed");
}

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
  const [preview, setPreview] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      let f = files[0];
      if (isHeic(f)) {
        f = await convertHeicToJpeg(f);
      }
      const compressed = await imageCompression(f, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      setPreview(URL.createObjectURL(compressed));
      await onUpload(compressed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      onError?.(msg);
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
        accept="image/*,image/heic,image/heif"
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
