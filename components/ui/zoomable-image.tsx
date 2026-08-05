"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function ZoomableImage({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`${className ?? ""} cursor-zoom-in`}
      />
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              close();
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                close();
              }}
              className="max-h-[90vh] max-w-[90vw] object-contain cursor-zoom-out"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
