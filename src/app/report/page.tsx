"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchReport, type WeeklyReport } from "@/lib/report-client";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 print:border-zinc-300">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ReportView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [days, setDays] = useState(7);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (d: number) => {
      if (!id) return;
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      try {
        setReport(await fetchReport(id, d));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Report sa nepodaril.");
      } finally {
        setLoading(false);
      }
    },
    [id, router],
  );

  useEffect(() => {
    load(days);
  }, [load, days]);

  if (loading) return <p className="text-sm text-muted">Generujem report…</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!report) return <p className="text-sm text-muted">Žiadne dáta.</p>;

  const s = report.stats;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex gap-2">
          <Button
            variant={days === 7 ? "primary" : "ghost"}
            onClick={() => setDays(7)}
          >
            7 dní
          </Button>
          <Button
            variant={days === 30 ? "primary" : "ghost"}
            onClick={() => setDays(30)}
          >
            30 dní
          </Button>
        </div>
        <Button variant="ghost" onClick={() => window.print()}>
          Stiahnuť PDF / Tlačiť
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8 print:border-0 print:bg-white print:p-0 print:text-black">
        <div className="mb-6 flex items-start justify-between border-b border-border pb-6 print:border-zinc-300">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              QA Agent — report dostupnosti
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{report.project.name}</h1>
            <p className="text-sm text-primary">{report.project.base_url}</p>
          </div>
          <div className="text-right text-xs text-muted">
            <p>Obdobie: posledných {report.days} dní</p>
            <p>
              {new Date(report.generatedAt).toLocaleDateString("sk-SK", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Dostupnosť"
            value={s.uptimePercent !== null ? `${s.uptimePercent}%` : "—"}
          />
          <Stat
            label="Priemerná odozva"
            value={s.priemernaOdozvaMs !== null ? `${s.priemernaOdozvaMs} ms` : "—"}
          />
          <Stat label="Výpadky" value={String(s.vypadky)} />
          <Stat label="Zmeny obsahu" value={String(s.pocetZmienObsahu)} />
        </div>

        {report.narrative && (
          <div className="rounded-xl border border-border bg-surface-2 p-6 print:border-zinc-300 print:bg-white">
            <Markdown text={report.narrative} className="print:text-black" />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Vygenerované službou QA Agent · {report.project.base_url}
        </p>
      </div>
    </>
  );
}

export default function ReportPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border print:hidden">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-foreground"
          >
            ← Späť na projekty
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 print:px-0 print:py-0">
        <Suspense fallback={<p className="text-sm text-muted">Načítavam…</p>}>
          <ReportView />
        </Suspense>
      </main>
    </div>
  );
}
