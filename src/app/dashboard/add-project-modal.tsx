"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/toaster";

export function AddProjectModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const baseUrl = String(form.get("base_url") ?? "").trim();

    if (!name || !baseUrl) {
      setError("Vyplňte názov aj URL.");
      return;
    }
    try {
      new URL(baseUrl);
    } catch {
      setError("Zadajte platnú URL (vrátane https://).");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Nie ste prihlásený.");
        return;
      }

      const { error: insErr } = await supabase
        .from("projects")
        .insert({ name, base_url: baseUrl, user_id: user.id });

      if (insErr) {
        setError(insErr.message);
        return;
      }

      setOpen(false);
      onAdded();
      toast("Projekt pridaný.", "success");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Pridať projekt</Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nový projekt</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
                aria-label="Zavrieť"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="name"
                name="name"
                label="Názov"
                placeholder="Môj web"
                required
              />
              <Input
                id="base_url"
                name="base_url"
                type="url"
                label="Base URL"
                placeholder="https://example.com"
                required
              />

              {error && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Zrušiť
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Ukladám…" : "Uložiť"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
