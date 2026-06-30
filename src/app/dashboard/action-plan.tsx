"use client";

import { useState } from "react";
import { actionPlan } from "@/lib/assistant-client";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/toaster";

export function ActionPlan({ hasProjects }: { hasProjects: boolean }) {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      setPlan(await actionPlan());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nepodarilo sa.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!hasProjects) return null;

  return (
    <div className="mb-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Akčný plán naprieč projektmi</p>
          <p className="text-sm text-muted">
            AI prejde všetky weby a zoradí, čo opraviť ako prvé — výpadky,
            expirujúce domény/SSL, kritické diery.
          </p>
        </div>
        <Button onClick={generate} disabled={loading}>
          {loading ? "Analyzujem…" : plan ? "Prepočítať" : "Vygenerovať plán"}
        </Button>
      </div>
      {plan && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <Markdown text={plan} />
        </div>
      )}
    </div>
  );
}
