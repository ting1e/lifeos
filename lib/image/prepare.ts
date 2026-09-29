import imageCompression from "browser-image-compression";

const HEIC_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

export function isHeic(file: File): boolean {
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

/**
 * Normalize a user-provided image before upload: HEIC → JPEG, then
 * downscale/compress. Shared by the file picker, drag & drop and clipboard
 * paste so every entry path sends the same kind of file.
 */
export async function prepareImageFile(file: File): Promise<File> {
  const source = isHeic(file) ? await convertHeicToJpeg(file) : file;
  return imageCompression(source, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  });
}
