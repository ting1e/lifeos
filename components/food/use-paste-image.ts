"use client";

import { useEffect, useRef } from "react";

function imageFileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;

  const items = data.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) return file;
      }
    }
  }

  for (const file of Array.from(data.files ?? [])) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
  );
}

/**
 * Run `onImage` when the user pastes an image from the clipboard
 * (Ctrl/Cmd+V, screenshot tools, copied web images). Pastes that carry no
 * image — and pastes into inputs/textareas — are left untouched so normal
 * text editing keeps working.
 */
export function usePasteImage(
  onImage: (file: File) => void | Promise<void>,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const handlerRef = useRef(onImage);
  useEffect(() => {
    handlerRef.current = onImage;
  }, [onImage]);

  useEffect(() => {
    if (!enabled) return;

    function onPaste(e: ClipboardEvent) {
      if (isEditableTarget(e.target)) return;
      const file = imageFileFromClipboard(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      void handlerRef.current(file);
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [enabled]);
}
