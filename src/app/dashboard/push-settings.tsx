"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { enablePush, testPush } from "@/lib/push-client";
import { toast } from "@/components/toaster";

export function PushSettings() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);

  async function enable() {
    setBusy(true);
    try {
      await enablePush();
      setEnabled(true);
      toast("Pop-up upozornenia zapnuté.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nepodarilo sa zapnúť.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      await testPush();
      toast("Testovacie upozornenie odoslané.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Test zlyhal.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted hover:text-foreground"
      >
        Pop-up upozornenia
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-medium">Pop-up upozornenia na ploche</p>
        <button
          onClick={() => setOpen(false)}
          className="text-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">
        Desktop notifikácia, keď web spadne — aj keď appku nemáš otvorenú.
        Prehliadač ťa raz požiada o povolenie.
      </p>
      <div className="flex gap-2">
        <Button onClick={enable} disabled={busy}>
          {busy ? "Moment…" : enabled ? "Zapnuté" : "Zapnúť notifikácie"}
        </Button>
        <Button variant="ghost" onClick={test} disabled={busy}>
          Poslať test
        </Button>
      </div>
    </div>
  );
}
