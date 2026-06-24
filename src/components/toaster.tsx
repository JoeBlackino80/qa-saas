"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

// Fire a toast from anywhere: toast("Hotovo", "success")
export function toast(message: string, type: ToastType = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("qa-toast", { detail: { message, type } }),
  );
}

let counter = 0;

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const { message, type } = (e as CustomEvent).detail as {
        message: string;
        type: ToastType;
      };
      const id = ++counter;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 4000);
    }
    window.addEventListener("qa-toast", onToast);
    return () => window.removeEventListener("qa-toast", onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex min-w-[240px] max-w-sm animate-in items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
            t.type === "success"
              ? "border-ok/40 bg-ok/10 text-ok"
              : t.type === "error"
                ? "border-danger/40 bg-danger/10 text-danger"
                : "border-border bg-surface text-foreground"
          }`}
        >
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
              t.type === "success"
                ? "bg-ok"
                : t.type === "error"
                  ? "bg-danger"
                  : "bg-primary"
            }`}
          />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
