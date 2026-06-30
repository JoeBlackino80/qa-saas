"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Check, Project } from "@/lib/types";

function uptimeWithin(rows: Check[], ms: number): number | null {
  const since = Date.now() - ms;
  const within = rows.filter((c) => Date.parse(c.created_at) >= since);
  if (within.length === 0) return null;
  const ok = within.filter((c) => c.ok).length;
  return Math.round((ok / within.length) * 1000) / 10;
}

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
          .select("id, status_code, ok, response_time_ms, error, created_at")
          .eq("project_id", id)
          .order("created_at", { ascending: false })
          .limit(300);
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
  const lastOnline = rows[0]?.ok ?? null;
  const times = rows
    .filter((c) => c.response_time_ms !== null)
    .map((c) => c.response_time_ms as number);
  const avgMs =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : null;

  const up24 = uptimeWithin(rows, 86400000);
  const up7 = uptimeWithin(rows, 7 * 86400000);
  const up30 = uptimeWithin(rows, 30 * 86400000);

  // Per-day status bars for the last 45 days.
  const byDay = new Map<string, { total: number; ok: number }>();
  for (const c of rows) {
    const key = new Date(c.created_at).toISOString().slice(0, 10);
    const e = byDay.get(key) ?? { total: 0, ok: 0 };
    e.total += 1;
    if (c.ok) e.ok += 1;
    byDay.set(key, e);
  }
  const DAYS = 45;
  const dayBars = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(Date.now() - (DAYS - 1 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    const e = byDay.get(key);
    const label = d.toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "numeric",
    });
    if (!e) return { key, state: "none" as const, label, title: `${label}: bez dát` };
    if (e.ok === e.total)
      return { key, state: "ok" as const, label, title: `${label}: funkčné` };
    if (e.ok === 0)
      return { key, state: "down" as const, label, title: `${label}: výpadok` };
    return {
      key,
      state: "partial" as const,
      label,
      title: `${label}: čiastočný výpadok (${e.ok}/${e.total})`,
    };
  });

  const chart = [...rows].slice(0, 60).reverse();
  const maxMs = Math.max(1, ...times);

  const Period = ({ label, val }: { label: string; val: number | null }) => (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`tabular mt-1 text-2xl font-semibold ${
          val === null
            ? "text-muted"
            : val >= 99.5
              ? "text-ok"
              : val >= 95
                ? "text-warn"
                : "text-danger"
        }`}
      >
        {val !== null ? `${val}%` : "—"}
      </p>
    </div>
  );

  return (
    <>
      <div className="mb-8 flex items-center gap-4">
        <span className="relative flex h-3.5 w-3.5">
          {lastOnline && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
          )}
          <span
            className={`relative inline-flex h-3.5 w-3.5 rounded-full ${
              lastOnline ? "bg-ok" : lastOnline === false ? "bg-danger" : "bg-muted"
            }`}
          />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="text-sm text-muted">{project.base_url}</p>
        </div>
        <span
          className={`ml-auto rounded-full px-3 py-1 text-sm font-medium ${
            lastOnline
              ? "bg-ok/15 text-ok"
              : lastOnline === false
                ? "bg-danger/15 text-danger"
                : "bg-surface-2 text-muted"
          }`}
        >
          {lastOnline === null
            ? "Bez dát"
            : lastOnline
              ? "Všetko funguje"
              : "Výpadok"}
        </span>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Period label="Uptime 24 h" val={up24} />
        <Period label="Uptime 7 dní" val={up7} />
        <Period label="Uptime 30 dní" val={up30} />
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted">
            Priemerná odozva
          </p>
          <p className="tabular mt-1 text-2xl font-semibold">
            {avgMs !== null ? `${avgMs} ms` : "—"}
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-wide text-muted">
            Posledných 45 dní
          </p>
          <p className="text-xs text-muted">
            {rows[0]
              ? `posledná kontrola ${new Date(rows[0].created_at).toLocaleString("sk-SK", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : "—"}
          </p>
        </div>
        <div className="flex items-end gap-[3px]">
          {dayBars.map((b) => (
            <div
              key={b.key}
              title={b.title}
              className={`h-9 flex-1 rounded-sm ${
                b.state === "ok"
                  ? "bg-ok"
                  : b.state === "down"
                    ? "bg-danger"
                    : b.state === "partial"
                      ? "bg-warn"
                      : "bg-surface-2"
              }`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-ok" /> Funkčné
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-warn" /> Čiastočný výpadok
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-danger" /> Výpadok
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-surface-2" /> Bez dát
          </span>
        </div>
      </div>

      {chart.length > 1 && (
        <div className="mb-8 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-muted">
            Odozva v čase (ms)
          </p>
          <div className="flex h-24 items-end gap-[3px]">
            {chart.map((c) => {
              const h =
                c.response_time_ms !== null
                  ? Math.max(4, (c.response_time_ms / maxMs) * 100)
                  : 100;
              return (
                <div
                  key={c.id}
                  title={c.ok ? `${c.response_time_ms} ms` : "offline"}
                  className={`flex-1 rounded-t-sm ${
                    c.ok
                      ? "bg-gradient-to-t from-primary/30 to-primary/80 opacity-80"
                      : "bg-danger/80"
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
