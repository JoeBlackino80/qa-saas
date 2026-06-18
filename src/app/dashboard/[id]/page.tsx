import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { RunCheckButton } from "./run-check-button";

type Check = {
  id: string;
  status_code: number | null;
  ok: boolean;
  response_time_ms: number | null;
  error: string | null;
  ai_report: string | null;
  created_at: string;
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, base_url, created_at")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: checks } = await supabase
    .from("checks")
    .select("id, status_code, ok, response_time_ms, error, ai_report, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = (checks ?? []) as Check[];

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
            ← Späť na projekty
          </Link>
          <span className="hidden text-sm text-muted sm:block">{user.email}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
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
          <RunCheckButton projectId={project.id} />
        </div>

        {!isAnthropicConfigured() && (
          <p className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            AI report je vypnutý – doplňte <code>ANTHROPIC_API_KEY</code> do
            <code> .env.local</code>. Kontrola dostupnosti funguje aj bez neho.
          </p>
        )}

        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted">
          História kontrol
        </h2>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
            <p className="text-foreground">Zatiaľ žiadne kontroly.</p>
            <p className="mt-1 text-sm text-muted">
              Kliknite na „Spustiť kontrolu".
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
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
                    <span className="text-sm text-muted">
                      {c.response_time_ms} ms
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted">
                    {new Date(c.created_at).toLocaleString("sk-SK")}
                  </span>
                </div>

                {c.error && (
                  <p className="mt-3 text-sm text-danger">{c.error}</p>
                )}

                {c.ai_report && (
                  <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                      AI report
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">
                      {c.ai_report}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
