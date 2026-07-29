"use client";

import { useEffect, useState } from "react";
import { Github, X } from "lucide-react";

const DISMISS_KEY = "lifeos-demo-banner-dismissed";

export function DemoBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY) !== "1") {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div className="w-full bg-[color:var(--accent)] text-white border-b border-black/10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex items-center gap-3">
        <span className="font-mono text-[12px] md:text-[13px] uppercase tracking-[0.1em] shrink-0">
          DEMO
        </span>
        <span className="text-[14px] md:text-[13px] flex-1 min-w-0 truncate md:whitespace-normal">
          Your edits live in this browser only. Nothing is sent to a server.
        </span>
        <a
          href="https://github.com/egebese/lifeos"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[13px] uppercase tracking-[0.08em] hover:underline shrink-0"
        >
          <Github size={12} strokeWidth={1.75} />
          github.com/egebese/lifeos
        </a>
        <button
          onClick={dismiss}
          aria-label="dismiss"
          className="shrink-0 inline-flex items-center justify-center w-7 h-7 hover:bg-black/10 transition"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
