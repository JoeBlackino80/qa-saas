"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { triggerCheck } from "@/lib/run-check-client";
import {
  runSecurityAudit,
  type SecurityAudit,
} from "@/lib/security-client";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import type { Check, Project, QualityAudit } from "@/lib/types";

function ProjectDetail() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<SecurityAudit | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [quality, setQuality] = useState<QualityAudit | null>(null);

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

    const { data: aud } = await supabase
      .from("security_audits")
      .select("grade, score, findings, ai_summary, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setAudit((aud as SecurityAudit) ?? null);

    const { data: q } = await supabase
      .from("quality_audits")
      .select(
        "performance, accessibility, best_practices, seo, broken_count, broken_links, blacklisted, blacklist_detail, created_at",
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setQuality((q as QualityAudit) ?? null);

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

  async function runAudit() {
    if (!id) return;
    setAuditing(true);
    setAuditError(null);
    try {
      setAudit(await runSecurityAudit(id));
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : "Audit zlyhal.");
    } finally {
      setAuditing(false);
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

      {total > 0 && (
        <div className="mb-6 flex animate-in flex-wrap items-center gap-6 rounded-2xl border border-border bg-surface px-6 py-5">
          <div className="flex items-center gap-3.5">
            <span
              className={`grid h-10 w-10 place-items-center rounded-full ${
                lastOnline ? "bg-ok/15" : "bg-danger/15"
              }`}
            >
              <span
                className={`h-3 w-3 rounded-full ${
                  lastOnline ? "bg-ok" : "bg-danger"
                }`}
              />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Stav</p>
              <p
                className={`text-2xl font-semibold ${
                  lastOnline ? "text-ok" : "text-danger"
                }`}
              >
                {lastOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          <div className="ml-auto flex gap-8 sm:gap-10">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Uptime
              </p>
              <p className="tabular mt-0.5 text-2xl font-semibold">{uptime}%</p>
              <p className="text-xs text-muted">{total} kontrol</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Odozva
              </p>
              <p className="tabular mt-0.5 text-2xl font-semibold">
                {avgMs !== null ? avgMs : "—"}
                <span className="ml-0.5 text-sm font-normal text-muted">ms</span>
              </p>
              <p className="text-xs text-muted">priemer</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-4">
        <button
          onClick={togglePublic}
          role="switch"
          aria-checked={Boolean(project.public_status)}
          aria-label="Verejný status page"
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            project.public_status ? "bg-primary" : "bg-surface-2 border border-border"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              project.public_status ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <div className="min-w-0 flex-1">
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
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-surface-2"
          >
            Otvoriť status page →
          </a>
        )}
      </div>

      {chart.length > 1 && (
        <div className="mb-8 animate-in rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="text-xs uppercase tracking-wide text-muted">
              Odozva v čase
            </p>
            <p className="tabular text-xs text-muted">max {maxMs} ms</p>
          </div>
          <div className="flex h-28 items-end gap-[3px]">
            {chart.map((c) => {
              const h =
                c.response_time_ms !== null
                  ? Math.max(4, (c.response_time_ms / maxMs) * 100)
                  : 100;
              return (
                <div
                  key={c.id}
                  title={c.ok ? `${c.response_time_ms} ms` : c.error ?? "offline"}
                  className={`flex-1 rounded-t-sm transition-opacity hover:opacity-100 ${
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

      <div className="mb-8 animate-in rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Bezpečnostný audit</p>
            <p className="text-xs text-muted">
              Pasívna analýza (hlavičky, TLS, cookies, mixed content). Spúšťaj
              len na weboch, ktoré vlastníš alebo máš povolenie.
            </p>
          </div>
          <Button variant="ghost" onClick={runAudit} disabled={auditing}>
            {auditing ? "Analyzujem…" : "Spustiť audit"}
          </Button>
        </div>
        {auditError && <p className="mb-3 text-sm text-danger">{auditError}</p>}

        {!audit && !auditError && (
          <p className="text-sm text-muted">Audit ešte nebol spustený.</p>
        )}

        {audit && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <span
                className={`grid h-14 w-14 place-items-center rounded-xl text-2xl font-bold ${
                  ["A", "B"].includes(audit.grade)
                    ? "bg-ok/15 text-ok"
                    : audit.grade === "C"
                      ? "bg-warn/15 text-warn"
                      : "bg-danger/15 text-danger"
                }`}
              >
                {audit.grade}
              </span>
              <div>
                <p className="tabular text-lg font-semibold">
                  {audit.score}/100
                </p>
                <p className="text-xs text-muted">bezpečnostné skóre</p>
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {[...audit.findings]
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2, ok: 3 };
                  return order[a.severity] - order[b.severity];
                })
                .map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        f.severity === "high"
                          ? "bg-danger/15 text-danger"
                          : f.severity === "medium"
                            ? "bg-warn/15 text-warn"
                            : f.severity === "low"
                              ? "bg-surface-2 text-muted"
                              : "bg-ok/15 text-ok"
                      }`}
                    >
                      {f.severity === "ok" ? "OK" : f.severity}
                    </span>
                    <span className="text-foreground/80">
                      <span className="font-medium text-foreground">
                        {f.title}
                      </span>{" "}
                      — {f.detail}
                    </span>
                  </li>
                ))}
            </ul>

            {audit.ai_summary && (
              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  AI zhrnutie
                </p>
                <Markdown text={audit.ai_summary} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-8 animate-in rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium">Výkon &amp; stabilita</p>
          <p className="text-xs text-muted">
            {quality
              ? `aktualizované ${new Date(quality.created_at).toLocaleDateString("sk-SK")}`
              : "beží denne (GitHub Actions)"}
          </p>
        </div>
        {!quality ? (
          <p className="text-sm text-muted">
            Zatiaľ bez dát — spustí sa automaticky (denne), alebo manuálne v
            GitHub Actions → „Quality audit".
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  ["Výkon", quality.performance],
                  ["Prístupnosť", quality.accessibility],
                  ["Best practices", quality.best_practices],
                  ["SEO", quality.seo],
                ] as [string, number | null][]
              ).map(([label, val]) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-surface-2 p-4 text-center"
                >
                  <p
                    className={`tabular text-2xl font-bold ${
                      val === null
                        ? "text-muted"
                        : val >= 90
                          ? "text-ok"
                          : val >= 50
                            ? "text-warn"
                            : "text-danger"
                    }`}
                  >
                    {val ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span
                className={`rounded-lg px-3 py-1.5 ${
                  (quality.broken_count ?? 0) > 0
                    ? "bg-danger/15 text-danger"
                    : "bg-ok/15 text-ok"
                }`}
              >
                Rozbité odkazy: {quality.broken_count ?? 0}
              </span>
              <span
                className={`rounded-lg px-3 py-1.5 ${
                  quality.blacklisted === true
                    ? "bg-danger/15 text-danger"
                    : quality.blacklisted === false
                      ? "bg-ok/15 text-ok"
                      : "bg-surface-2 text-muted"
                }`}
                title={quality.blacklist_detail ?? ""}
              >
                Blacklist:{" "}
                {quality.blacklisted === true
                  ? "na zozname"
                  : quality.blacklisted === false
                    ? "čistý"
                    : "nekontrolované"}
              </span>
            </div>
            {quality.broken_links && quality.broken_links.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {quality.broken_links.slice(0, 8).map((l, i) => (
                  <li key={i} className="flex gap-2 text-muted">
                    <span className="tabular shrink-0 text-danger">
                      {l.status || "ERR"}
                    </span>
                    <span className="truncate">{l.url}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

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
            <li
              key={c.id}
              className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-border/60"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.ok ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      c.ok ? "bg-ok" : "bg-danger"
                    }`}
                  />
                  {c.ok ? "Online" : "Offline"}
                </span>
                {c.status_code !== null && (
                  <span className="tabular text-sm text-muted">
                    HTTP {c.status_code}
                  </span>
                )}
                {c.response_time_ms !== null && (
                  <span className="tabular text-sm text-muted">
                    {c.response_time_ms} ms
                  </span>
                )}
                <span className="tabular ml-auto text-xs text-muted">
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
