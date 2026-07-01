"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchReport, type WeeklyReport } from "@/lib/report-client";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { loadMyBranding, type Branding } from "@/lib/branding-client";
import type { SecurityAudit } from "@/lib/security-client";
import type { Project, QualityAudit } from "@/lib/types";

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
const gradeText = (g: string) =>
  ["A", "B"].includes(g)
    ? "text-ok"
    : g === "C"
      ? "text-warn"
      : g === "—"
        ? "text-muted"
        : "text-danger";
const daysLeft = (iso?: string | null) =>
  iso ? Math.floor((Date.parse(iso) - Date.now()) / 86400000) : null;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 print:border-zinc-300 print:bg-white">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold print:text-black">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 break-inside-avoid rounded-2xl border border-border bg-surface p-6 print:border-zinc-300 print:bg-white">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

function ReportView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [days, setDays] = useState(30);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [sec, setSec] = useState<SecurityAudit | null>(null);
  const [gdpr, setGdpr] = useState<SecurityAudit | null>(null);
  const [qual, setQual] = useState<QualityAudit | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
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
        const [rep, brand] = await Promise.all([
          fetchReport(id, d),
          loadMyBranding(),
        ]);
        setReport(rep);
        setBranding(brand);

        const { data: proj } = await supabase
          .from("projects")
          .select("id, name, base_url, ssl_expires_at, domain_expires_at")
          .eq("id", id)
          .maybeSingle();
        setProject((proj as Project) ?? null);

        const { data: s } = await supabase
          .from("security_audits")
          .select("grade, score, findings, ai_summary, created_at")
          .eq("project_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setSec((s as SecurityAudit) ?? null);

        const { data: gd } = await supabase
          .from("gdpr_audits")
          .select("grade, score, findings, ai_summary, created_at")
          .eq("project_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setGdpr((gd as SecurityAudit) ?? null);

        const { data: q } = await supabase
          .from("quality_audits")
          .select(
            "performance, accessibility, best_practices, seo, broken_count, broken_links, blacklisted, blacklist_detail, created_at",
          )
          .eq("project_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setQual((q as QualityAudit) ?? null);
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
  const perfAvg = qual
    ? Math.round(
        ((qual.performance ?? 0) +
          (qual.accessibility ?? 0) +
          (qual.best_practices ?? 0) +
          (qual.seo ?? 0)) /
          4,
      )
    : null;
  const secScore = sec?.score ?? null;
  const gdprScore = gdpr?.score ?? null;
  const parts = [s.uptimePercent, secScore, perfAvg, gdprScore].filter(
    (x): x is number => x !== null && x !== undefined,
  );
  const gdprIssues = gdpr
    ? [...gdpr.findings]
        .filter((f) => f.severity !== "ok")
        .sort((a, b) => {
          const o = { high: 0, medium: 1, low: 2, ok: 3 };
          return o[a.severity] - o[b.severity];
        })
    : [];
  const overall = parts.length
    ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
    : null;
  const overallGrade = gradeOf(overall);
  const sslD = daysLeft(project?.ssl_expires_at);
  const domD = daysLeft(project?.domain_expires_at);
  const issues = sec
    ? [...sec.findings]
        .filter((f) => f.severity !== "ok")
        .sort((a, b) => {
          const o = { high: 0, medium: 1, low: 2, ok: 3 };
          return o[a.severity] - o[b.severity];
        })
    : [];

  const brand = branding?.brand_color || "#4f46e5";
  const agency = branding?.agency_name?.trim();

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
        <Button onClick={() => window.print()}>Stiahnuť PDF / Tlačiť</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface print:border-0 print:bg-white print:text-black">
        <div className="h-1.5 w-full" style={{ backgroundColor: brand }} />
        <div className="p-8 print:p-0">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-6 print:border-zinc-300">
            <div className="flex items-center gap-3">
              {branding?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logo_url}
                  alt={agency ?? "logo"}
                  className="h-12 w-12 shrink-0 rounded-lg border border-border object-contain print:border-zinc-300"
                />
              )}
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: brand }}
                >
                  {agency || "QA Agent"} — report stavu webu
                </p>
                <h1 className="mt-1 text-2xl font-semibold print:text-black">
                  {report.project.name}
                </h1>
                <p className="text-sm" style={{ color: brand }}>
                  {report.project.base_url}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right text-xs text-muted">
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

        {overall !== null && (
          <div className="mb-6 flex break-inside-avoid items-center gap-5 rounded-2xl border border-border bg-surface-2 p-6 print:border-zinc-300 print:bg-white">
            <span
              className={`grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-surface text-4xl font-bold print:bg-white ${gradeText(overallGrade)}`}
            >
              {overallGrade}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Celková známka webu
              </p>
              <p className="tabular text-3xl font-bold print:text-black">
                {overall}/100
              </p>
              <p className="mt-1 text-sm text-muted">
                Priemer z dostupnosti, bezpečnosti a výkonu.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Dostupnosť"
            value={s.uptimePercent !== null ? `${s.uptimePercent}%` : "—"}
          />
          <Stat
            label="Priemerná odozva"
            value={
              s.priemernaOdozvaMs !== null ? `${s.priemernaOdozvaMs} ms` : "—"
            }
          />
          <Stat label="Výpadky" value={String(s.vypadky)} />
          <Stat label="Zmeny obsahu" value={String(s.pocetZmienObsahu)} />
        </div>

        {sec && (
          <Section title="Bezpečnosť">
            <div className="flex flex-wrap items-center gap-4">
              <span
                className={`grid h-14 w-14 place-items-center rounded-xl text-2xl font-bold print:bg-white ${
                  ["A", "B"].includes(sec.grade)
                    ? "bg-ok/15 text-ok"
                    : sec.grade === "C"
                      ? "bg-warn/15 text-warn"
                      : "bg-danger/15 text-danger"
                }`}
              >
                {sec.grade}
              </span>
              <div>
                <p className="tabular text-lg font-semibold print:text-black">
                  {sec.score}/100
                </p>
                <p className="text-xs text-muted">
                  {issues.length === 0
                    ? "Bez zistených problémov"
                    : `${issues.length} ${issues.length === 1 ? "zistenie" : "zistení"} na opravu`}
                </p>
              </div>
            </div>
            {issues.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5 text-sm">
                {issues.slice(0, 10).map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        f.severity === "high"
                          ? "bg-danger/15 text-danger"
                          : f.severity === "medium"
                            ? "bg-warn/15 text-warn"
                            : "bg-surface text-muted print:bg-white"
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-foreground/80 print:text-black">
                      <span className="font-medium print:text-black">
                        {f.title}
                      </span>{" "}
                      — {f.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {gdpr && (
          <Section title="GDPR a cookies">
            <div className="flex flex-wrap items-center gap-4">
              <span
                className={`grid h-14 w-14 place-items-center rounded-xl text-2xl font-bold print:bg-white ${
                  ["A", "B"].includes(gdpr.grade)
                    ? "bg-ok/15 text-ok"
                    : gdpr.grade === "C"
                      ? "bg-warn/15 text-warn"
                      : "bg-danger/15 text-danger"
                }`}
              >
                {gdpr.grade}
              </span>
              <div>
                <p className="tabular text-lg font-semibold print:text-black">
                  {gdpr.score}/100
                </p>
                <p className="text-xs text-muted">
                  {gdprIssues.length === 0
                    ? "Bez zistených nedostatkov"
                    : `${gdprIssues.length} ${gdprIssues.length === 1 ? "nedostatok" : gdprIssues.length < 5 ? "nedostatky" : "nedostatkov"} na doriešenie`}
                </p>
              </div>
            </div>
            {gdprIssues.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5 text-sm">
                {gdprIssues.slice(0, 10).map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        f.severity === "high"
                          ? "bg-danger/15 text-danger"
                          : f.severity === "medium"
                            ? "bg-warn/15 text-warn"
                            : "bg-surface text-muted print:bg-white"
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-foreground/80 print:text-black">
                      <span className="font-medium print:text-black">
                        {f.title}
                      </span>{" "}
                      — {f.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {qual && (
          <Section title="Výkon a kvalita">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  ["Výkon", qual.performance],
                  ["Prístupnosť", qual.accessibility],
                  ["Best practices", qual.best_practices],
                  ["SEO", qual.seo],
                ] as [string, number | null][]
              ).map(([label, val]) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-surface p-4 text-center print:border-zinc-300 print:bg-white"
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
            <p className="mt-4 text-sm text-foreground/80 print:text-black">
              Rozbité odkazy: {qual.broken_count ?? 0} · Blacklist:{" "}
              {qual.blacklisted === true
                ? "na zozname"
                : qual.blacklisted === false
                  ? "čistý"
                  : "nekontrolované"}
            </p>
          </Section>
        )}

        {(sslD !== null || domD !== null) && (
          <Section title="Doména a certifikát">
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ["SSL certifikát", project?.ssl_expires_at, sslD],
                  ["Doména", project?.domain_expires_at, domD],
                ] as [string, string | null | undefined, number | null][]
              ).map(([label, iso, d]) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-surface p-4 print:border-zinc-300 print:bg-white"
                >
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {label}
                  </p>
                  {d === null ? (
                    <p className="mt-1 text-sm text-muted">nezistené</p>
                  ) : (
                    <>
                      <p
                        className={`tabular mt-1 text-xl font-bold ${
                          d <= 7
                            ? "text-danger"
                            : d <= 30
                              ? "text-warn"
                              : "text-ok"
                        }`}
                      >
                        {d < 0 ? "vypršalo" : `o ${d} dní`}
                      </p>
                      <p className="tabular text-xs text-muted">
                        {new Date(iso as string).toLocaleDateString("sk-SK")}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {report.narrative && (
          <Section title="Zhrnutie">
            <Markdown text={report.narrative} className="print:text-black" />
          </Section>
        )}

          <p className="mt-6 text-center text-xs text-muted">
            {agency
              ? `Report pripravil(a) ${agency}${branding?.website_url ? ` · ${branding.website_url}` : ""}${branding?.contact_email ? ` · ${branding.contact_email}` : ""}`
              : "Vygenerované službou QA Agent"}
          </p>
        </div>
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
