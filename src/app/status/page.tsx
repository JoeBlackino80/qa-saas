"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Check, Project } from "@/lib/types";

function StatusView() {
  const params = useSearchParams();
  const id = params.get("id");
  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    (async () => {
      const { data: proj } = await supabase
        .from("projects")
        .select("id, name, base_url, created_at")
        .eq("id", id)
        .maybeSingle();
      setProject((proj as Project) ?? null);
      if (proj) {
        const { data: checks } = await supabase
          .from("checks")
          .select(
            "id, status_code, ok, response_time_ms, error, ai_report, changes, created_at",
          )
          .eq("project_id", id)
          .order("created_at", { ascending: false })
          .limit(50);
        setRows((checks ?? []) as Check[]);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-sm text-muted">Načítavam…</p>;
  if (!project)
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
        <p className="text-foreground">Status page nie je dostupný.</p>
        <p className="mt-1 text-sm text-muted">
          Projekt neexistuje alebo nie je verejný.
        </p>
      </div>
    );

  const total = rows.length;
  const okCount = rows.filter((c) => c.ok).length;
  const uptime = total > 0 ? Math.round((okCount / total) * 1000) / 10 : null;
  const times = rows
    .filter((c) => c.response_time_ms !== null)
    .map((c) => c.response_time_ms as number);
  const avgMs =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : null;
  const lastOnline = rows[0]?.ok ?? null;
  const chart = [...rows].reverse();
  const maxMs = Math.max(1, ...times);

  return (
    <>
      <div className="mb-8 flex items-center gap-4">
        <span
          className={`h-4 w-4 rounded-full ${
            lastOnline ? "bg-emerald-400" : "bg-danger"
          }`}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="text-sm text-muted">{project.base_url}</p>
        </div>
        <span
          className={`ml-auto rounded-full px-3 py-1 text-sm font-medium ${
            lastOnline
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-danger/15 text-danger"
          }`}
        >
          {lastOnline === null
            ? "Bez dát"
            : lastOnline
              ? "Všetko funguje"
              : "Výpadok"}
        </span>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">
            Dostupnosť ({total})
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {uptime !== null ? `${uptime}%` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">
            Priemerná odozva
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {avgMs !== null ? `${avgMs} ms` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">
            Posledná kontrola
          </p>
          <p className="mt-1 text-sm font-medium">
            {rows[0]
              ? new Date(rows[0].created_at).toLocaleString("sk-SK")
              : "—"}
          </p>
        </div>
      </div>

      {chart.length > 1 && (
        <div className="mb-8 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-muted">
            Odozva v čase (ms)
          </p>
          <div className="flex h-24 items-end gap-1">
            {chart.map((c) => {
              const h =
                c.response_time_ms !== null
                  ? Math.max(4, (c.response_time_ms / maxMs) * 100)
                  : 100;
              return (
                <div
                  key={c.id}
                  title={c.ok ? `${c.response_time_ms} ms` : "offline"}
                  className={`flex-1 rounded-t ${
                    c.ok ? "bg-primary/70" : "bg-danger/70"
                  }`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted">
        Status page · poháňa QA Agent
      </p>
    </>
  );
}

export default function StatusPage() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Suspense fallback={<p className="text-sm text-muted">Načítavam…</p>}>
          <StatusView />
        </Suspense>
      </main>
    </div>
  );
}
