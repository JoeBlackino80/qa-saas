"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { triggerCheck } from "@/lib/run-check-client";
import {
  runSecurityAudit,
  runQualityAudit,
  triggerTests,
  type SecurityAudit,
} from "@/lib/security-client";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { toast } from "@/components/toaster";
import { fixFor } from "@/lib/fixes";
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
  const [qRunning, setQRunning] = useState(false);
  const [qError, setQError] = useState<string | null>(null);
  const [secPrev, setSecPrev] = useState<number | null>(null);
  const [qualPrev, setQualPrev] = useState<number | null>(null);
  const [secTrend, setSecTrend] = useState<number[]>([]);
  const [qualTrend, setQualTrend] = useState<number[]>([]);
  const [openFix, setOpenFix] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

  const busyAny = running || auditing || qRunning || runningAll;

  async function runAll() {
    if (!id) return;
    setRunningAll(true);
    toast("Spúšťam všetko…", "info");
    try {
      await triggerCheck(id, true);
      try {
        setAudit(await runSecurityAudit(id));
      } catch { /* keep going */ }
      try {
        const q = await runQualityAudit(id);
        setQuality(q as QualityAudit);
      } catch { /* keep going */ }
      try {
        await triggerTests();
      } catch { /* keep going */ }
      await load();
      toast("Hotovo — kontrola a audity dokončené, testy spustené.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Niečo zlyhalo.", "error");
    } finally {
      setRunningAll(false);
    }
  }

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
      .limit(20);
    const secRows = (aud ?? []) as SecurityAudit[];
    setAudit(secRows[0] ?? null);
    setSecPrev(secRows[1]?.score ?? null);
    setSecTrend([...secRows].reverse().map((a) => a.score));

    const { data: q } = await supabase
      .from("quality_audits")
      .select(
        "performance, accessibility, best_practices, seo, broken_count, broken_links, blacklisted, blacklist_detail, created_at",
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    const qRows = (q ?? []) as QualityAudit[];
    setQuality(qRows[0] ?? null);
    setQualPrev(qRows[1]?.performance ?? null);
    setQualTrend([...qRows].reverse().map((a) => a.performance ?? 0));

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
      toast("Kontrola dokončená.", "success");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Kontrola zlyhala.";
      setError(m);
      toast(m, "error");
    } finally {
      setRunning(false);
    }
  }

  async function runQuality() {
    if (!id) return;
    setQRunning(true);
    setQError(null);
    try {
      const q = await runQualityAudit(id);
      setQuality(q as QualityAudit);
      toast("Audit výkonu dokončený.", "success");
      if (q?.psi_error) {
        setQError(
          `Lighthouse skóre sa nenačítalo (${q.psi_error}). Pre skóre treba PageSpeed API kľúč — rozbité odkazy/blacklist fungujú aj bez neho.`,
        );
      }
    } catch (e) {
      setQError(e instanceof Error ? e.message : "Audit zlyhal.");
    } finally {
      setQRunning(false);
    }
  }

  async function runAudit() {
    if (!id) return;
    setAuditing(true);
    setAuditError(null);
    try {
      setAudit(await runSecurityAudit(id));
      toast("Bezpečnostný audit dokončený.", "success");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Audit zlyhal.";
      setAuditError(m);
      toast(m, "error");
    } finally {
      setAuditing(false);
    }
  }

  async function deleteProject() {
    if (!id) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);
      if (delErr) {
        toast(delErr.message, "error");
        setDeleting(false);
        return;
      }
      toast("Projekt zmazaný.", "success");
      router.replace("/dashboard");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Mazanie zlyhalo.", "error");
      setDeleting(false);
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

  // Overall website grade — average of availability, security and performance.
  const perfAvg = quality
    ? Math.round(
        ((quality.performance ?? 0) +
          (quality.accessibility ?? 0) +
          (quality.best_practices ?? 0) +
          (quality.seo ?? 0)) /
          4,
      )
    : null;
  const secScore = audit?.score ?? null;
  const overallParts = [uptime, secScore, perfAvg].filter(
    (x): x is number => x !== null,
  );
  const overall = overallParts.length
    ? Math.round(overallParts.reduce((a, b) => a + b, 0) / overallParts.length)
    : null;
  const gradeOf = (s: number | null) =>
    s === null
      ? "—"
      : s >= 90
        ? "A"
        : s >= 80
          ? "B"
          : s >= 70
            ? "C"
            : s >= 55
              ? "D"
              : "F";
  const gradeColor = (g: string) =>
    ["A", "B"].includes(g)
      ? "text-ok"
      : g === "C"
        ? "text-warn"
        : g === "—"
          ? "text-muted"
          : "text-danger";
  const overallGrade = gradeOf(overall);

  function Delta({ now, prev }: { now: number | null; prev: number | null }) {
    if (now === null || prev === null) return null;
    const d = now - prev;
    if (d === 0)
      return <span className="text-xs text-muted">bez zmeny</span>;
    return (
      <span className={`text-xs font-medium ${d > 0 ? "text-ok" : "text-danger"}`}>
        {d > 0 ? "↑" : "↓"} {Math.abs(d)} oproti minule
      </span>
    );
  }

  function Sparkline({ data }: { data: number[] }) {
    if (data.length < 2) return null;
    const max = 100;
    return (
      <div className="flex h-10 items-end gap-0.5">
        {data.map((v, i) => (
          <div
            key={i}
            title={`${v}`}
            className={`w-1.5 rounded-t-sm ${
              v >= 90 ? "bg-ok" : v >= 50 ? "bg-warn" : "bg-danger"
            }`}
            style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-4">
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
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/report?id=${project.id}`}>
            <Button variant="ghost">Klientsky report</Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            className="text-danger hover:bg-danger/10"
          >
            Zmazať
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3">
        <Button onClick={runAll} disabled={busyAny}>
          {runningAll ? "Spúšťam všetko…" : "Spustiť všetko"}
        </Button>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <Button variant="ghost" onClick={runCheck} disabled={busyAny}>
          {running ? "Kontrolujem…" : "Kontrola"}
        </Button>
        <Button variant="ghost" onClick={runAudit} disabled={busyAny}>
          {auditing ? "Analyzujem…" : "Bezpečnostný audit"}
        </Button>
        <Button variant="ghost" onClick={runQuality} disabled={busyAny}>
          {qRunning ? "Analyzujem…" : "Audit výkonu"}
        </Button>
        <Link href={`/tests?id=${project.id}`}>
          <Button variant="ghost">Testy</Button>
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {overall !== null && (
        <div className="mb-6 flex animate-in flex-wrap items-center gap-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-surface px-6 py-5">
          <div className="flex items-center gap-4">
            <span
              className={`grid h-16 w-16 place-items-center rounded-2xl bg-surface text-3xl font-bold ${gradeColor(overallGrade)}`}
            >
              {overallGrade}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Celková známka webu
              </p>
              <p className="tabular text-2xl font-semibold">{overall}/100</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Dostupnosť
              </p>
              <p className="tabular mt-0.5 font-semibold">
                {uptime !== null ? `${uptime}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Bezpečnosť
              </p>
              <p className="tabular mt-0.5 font-semibold">
                {secScore !== null ? `${secScore}/100` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Výkon
              </p>
              <p className="tabular mt-0.5 font-semibold">
                {perfAvg !== null ? `${perfAvg}/100` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

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
          <Button variant="ghost" onClick={runAudit} disabled={busyAny}>
            {auditing ? "Analyzujem…" : "Spustiť audit"}
          </Button>
        </div>
        {auditError && <p className="mb-3 text-sm text-danger">{auditError}</p>}

        {!audit && !auditError && (
          <p className="text-sm text-muted">Audit ešte nebol spustený.</p>
        )}

        {audit && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-4">
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
                <Delta now={audit.score} prev={secPrev} />
              </div>
              {secTrend.length > 1 && (
                <div className="hidden sm:block">
                  <p className="mb-1 text-xs text-muted">trend</p>
                  <Sparkline data={secTrend} />
                </div>
              )}
              <div className="ml-auto text-right text-xs">
                <div className="flex justify-end gap-1.5">
                  {(() => {
                    const c = audit.findings.filter((f) => f.severity === "high").length;
                    const w = audit.findings.filter((f) => f.severity === "medium").length;
                    const o = audit.findings.filter((f) => f.severity === "ok").length;
                    return (
                      <>
                        {c > 0 && <span className="rounded bg-danger/15 px-1.5 py-0.5 font-medium text-danger">{c} kritické</span>}
                        {w > 0 && <span className="rounded bg-warn/15 px-1.5 py-0.5 font-medium text-warn">{w} varovaní</span>}
                        <span className="rounded bg-ok/15 px-1.5 py-0.5 font-medium text-ok">{o} OK</span>
                      </>
                    );
                  })()}
                </div>
                {audit.created_at && (
                  <p className="tabular mt-1.5 text-muted">
                    {new Date(audit.created_at).toLocaleString("sk-SK")}
                  </p>
                )}
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {[...audit.findings]
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2, ok: 3 };
                  return order[a.severity] - order[b.severity];
                })
                .map((f, i) => {
                  const fix = f.severity !== "ok" ? fixFor(f.title) : null;
                  return (
                    <li key={i} className="text-sm">
                      <div className="flex items-start gap-2">
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
                          {fix && (
                            <button
                              onClick={() =>
                                setOpenFix(openFix === i ? null : i)
                              }
                              className="ml-2 whitespace-nowrap font-medium text-primary hover:underline"
                            >
                              {openFix === i ? "Skryť" : "Ako opraviť →"}
                            </button>
                          )}
                        </span>
                      </div>
                      {fix && openFix === i && (
                        <div className="ml-10 mt-2 rounded-lg border border-border bg-surface-2 p-3">
                          <p className="text-foreground/80">{fix.how}</p>
                          {fix.code && (
                            <div className="mt-2">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wide text-muted">
                                  {fix.lang ?? "kód"}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard?.writeText(fix.code!);
                                    toast("Skopírované.", "success");
                                  }}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Kopírovať
                                </button>
                              </div>
                              <pre className="overflow-x-auto rounded bg-background p-3 font-mono text-xs text-foreground/90">
                                {fix.code}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Výkon &amp; stabilita</p>
            <p className="tabular text-xs text-muted">
              {quality
                ? `naposledy ${new Date(quality.created_at).toLocaleString("sk-SK")}`
                : "Lighthouse skóre, rozbité odkazy, blacklist."}
            </p>
            {quality && (
              <div className="mt-1">
                <Delta now={quality.performance} prev={qualPrev} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {qualTrend.length > 1 && (
              <div className="hidden sm:block">
                <p className="mb-1 text-xs text-muted">trend výkonu</p>
                <Sparkline data={qualTrend} />
              </div>
            )}
            <Button variant="ghost" onClick={runQuality} disabled={busyAny}>
              {qRunning ? "Analyzujem…" : "Spustiť audit výkonu"}
            </Button>
          </div>
        </div>
        {qError && <p className="mb-3 text-sm text-warn">{qError}</p>}
        {!quality ? (
          <p className="text-sm text-muted">
            Audit ešte nebol spustený. Klikni na „Spustiť audit výkonu".
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
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full ${
                        val === null
                          ? "bg-muted"
                          : val >= 90
                            ? "bg-ok"
                            : val >= 50
                              ? "bg-warn"
                              : "bg-danger"
                      }`}
                      style={{ width: `${val ?? 0}%` }}
                    />
                  </div>
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

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-md animate-in rounded-2xl border border-border bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Zmazať „{project.name}"?</h3>
            <p className="mt-2 text-sm text-muted">
              Táto akcia sa nedá vrátiť. Odstráni sa projekt aj celá jeho
              história kontrol, auditov a testov.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Zrušiť
              </Button>
              <Button variant="danger" onClick={deleteProject} disabled={deleting}>
                {deleting ? "Mažem…" : "Áno, zmazať"}
              </Button>
            </div>
          </div>
        </div>
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
