"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n/client";

type Options = {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmHandler = (opts: Options) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmHandler | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<Options | null>(null);
  const resolveRef = React.useRef<((v: boolean) => void) | null>(null);

  const confirm: ConfirmHandler = useCallback((opts) => {
    setOpts(opts);
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function close(result: boolean) {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      setOpts(null);
      resolveRef.current?.(result);
      resolveRef.current = null;
    }, 150);
  }

  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    window.addEventListener("keydown", handle);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handle);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open && opts && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-150 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => close(false)}
          />
          <div
            className={`fixed z-50 left-1/2 top-1/2 w-[min(420px,calc(100vw-2rem))] bg-[color:var(--surface)] border border-[color:var(--border-visible)] shadow-xl p-6 space-y-5 transition-all duration-150 ease-out ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transform: visible
                ? "translate(-50%, -50%)"
                : "translate(-50%, calc(-50% - 8px))",
            }}
          >
            <p className="font-body text-lg text-[color:var(--text-display)] leading-relaxed">
              {opts.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="btn btn--outline btn--sm"
              >
                {opts.cancelLabel ?? t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`btn btn--sm ${opts.danger ? "btn--danger" : "btn--accent"}`}
              >
                {opts.confirmLabel ?? t("common.confirm")}
              </button>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
