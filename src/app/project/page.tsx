"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { triggerCheck } from "@/lib/run-check-client";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import type { Check, Project } from "@/lib/types";

function ProjectDetail() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: proj } = await supabase
      .from("projects")
      .select("id, name, base_url, created_at, public_status")
      .eq("id", id)
      .maybeSingle();
    setProject((proj as Project) ?? null);

    const { data: checks } = await supabase
      .from("checks")
      .select(
        "id, status_code, ok, response_time_ms, error, ai_report, changes, created_at",
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((checks ?? []) as Check[]);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function runCheck() {
    if (!id) return;
    setRunning(true);
    setError(null);
    try {
      await triggerCheck(id, true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kontrola zlyhala.");
    } finally {
      setRunning(false);
    }
  }

  async function togglePublic() {
    if (!project) return;
    const next = !project.public_status;
    const supabase = createClient();
    const { error: upErr } = await supabase
      .from("projects")
      .update({ public_status: next })
      .eq("id", project.id);
    if (!upErr) setProject({ ...project, public_status: next });
  }

  if (loading) {
    return <p className="text-sm text-muted">Načítavam…</p>;
  }
  if (!project) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
        <p className="text-foreground">Projekt sa nenašiel.</p>
        <Link href="/dashboard" className="mt-2 inline-block text-sm text-primary hover:underline">
          ← Späť na projekty
        </Link>
      </div>
    );
  }

  // Stats over loaded checks.
  const total = rows.length;
  const okCount = rows.filter((c) => c.ok).length;
  const uptime = total > 0 ? Math.round((okCount / total) * 100) : null;
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <a
            href={project.base_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-sm text-primary hover:underline"
          >
            {project.base_url}
          </a>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={`/tests?id=${project.id}`}>
              <Button variant="ghost">Testy</Button>
            </Link>
            <Link href={`/report?id=${project.id}`}>
              <Button variant="ghost">Klientsky report</Button>
            </Link>
            <Button onClick={runCheck} disabled={running}>
              {running ? "Kontrolujem…" : "Spustiť kontrolu"}
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        <button
          onClick={togglePublic}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            project.public_status ? "bg-primary" : "bg-surface-2"
          }`}
          aria-label="Verejný status page"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              project.public_status ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <div className="flex-1">
          <p className="text-sm font-medium">Verejný status page</p>
          <p className="text-xs text-muted">
            Zdieľateľná stránka so stavom webu pre klienta (bez prihlásenia).
          </p>
        </div>
        {project.public_status && (
          <a
            href={`/status/?id=${project.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface-2"
          >
            Otvoriť status page →
          </a>
        )}
      </div>

      {total > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-muted">Stav</p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                lastOnline ? "text-emerald-400" : "text-danger"
              }`}
            >
              {lastOnline ? "Online" : "Offline"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-muted">
              Uptime ({total} kontrol)
            </p>
            <p className="mt-1 text-2xl font-semibold">{uptime}%</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-muted">
              Priemerná odozva
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {avgMs !== null ? `${avgMs} ms` : "—"}
            </p>
          </div>
        </div>
      )}

      {chart.length > 1 && (
        <div className="mb-8 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-muted">
            Odozva v čase (ms)
          </p>
          <div className="flex h-28 items-end gap-1">
            {chart.map((c) => {
              const h =
                c.response_time_ms !== null
                  ? Math.max(4, (c.response_time_ms / maxMs) * 100)
                  : 100;
              return (
                <div
                  key={c.id}
                  title={c.ok ? `${c.response_time_ms} ms` : c.error ?? "offline"}
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

      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted">
        História kontrol
      </h2>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <p className="text-foreground">Zatiaľ žiadne kontroly.</p>
          <p className="mt-1 text-sm text-muted">Kliknite na „Spustiť kontrolu".</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.ok
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-danger/15 text-danger"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      c.ok ? "bg-emerald-400" : "bg-danger"
                    }`}
                  />
                  {c.ok ? "Online" : "Offline"}
                </span>
                {c.status_code !== null && (
                  <span className="text-sm text-muted">HTTP {c.status_code}</span>
                )}
                {c.response_time_ms !== null && (
                  <span className="text-sm text-muted">{c.response_time_ms} ms</span>
                )}
                <span className="ml-auto text-xs text-muted">
                  {new Date(c.created_at).toLocaleString("sk-SK")}
                </span>
              </div>

              {c.error && <p className="mt-3 text-sm text-danger">{c.error}</p>}

              {c.changes && c.changes.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {c.changes.map((ch, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                        ch.severity === "critical"
                          ? "bg-danger/10 text-danger"
                          : ch.severity === "warning"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-surface-2 text-foreground/80"
                      }`}
                    >
                      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide opacity-70">
                        {ch.severity === "critical"
                          ? "Kritické"
                          : ch.severity === "warning"
                            ? "Varovanie"
                            : "Info"}
                      </span>
                      <span>{ch.message}</span>
                    </li>
                  ))}
                </ul>
              )}

              {c.ai_report && (
                <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    AI report
                  </p>
                  <Markdown text={c.ai_report} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ProjectPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
            ← Späť na projekty
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Suspense fallback={<p className="text-sm text-muted">Načítavam…</p>}>
          <ProjectDetail />
        </Suspense>
      </main>
    </div>
  );
}
