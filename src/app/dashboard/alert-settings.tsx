"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AlertSettings() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_app_secret", {
        secret_name: "slack_webhook_url",
        secret_value: value.trim(),
      });
      setMsg(error ? `Chyba: ${error.message}` : "Uložené. Alerty sú zapnuté.");
      if (!error) setValue("");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted hover:text-foreground"
      >
        Upozornenia
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-medium">Upozornenia pri výpadku / zmene (Slack)</p>
        <button
          onClick={() => setOpen(false)}
          className="text-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">
        Vlož Slack <strong>Incoming Webhook URL</strong> — pri výpadku alebo
        kritickej zmene obsahu ti príde správa. (Slack → Apps → Incoming
        Webhooks → Add → skopíruj URL.)
      </p>
      <div className="flex gap-2">
        <Input
          id="slack"
          name="slack"
          type="url"
          placeholder="https://hooks.slack.com/services/…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1"
        />
        <Button onClick={save} disabled={pending || !value.trim()}>
          {pending ? "Ukladám…" : "Uložiť"}
        </Button>
      </div>
      {msg && <p className="mt-2 text-sm text-foreground/80">{msg}</p>}
    </div>
  );
}
