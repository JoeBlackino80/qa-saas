"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateTest } from "@/lib/generate-test-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESETS: { label: string; name: string; steps: string }[] = [
  { label: "— Vyber šablónu —", name: "", steps: "" },
  {
    label: "Smoke test (načítanie)",
    name: "Smoke test",
    steps: "goto /\nexpectSelector body",
  },
  {
    label: "Kontaktný formulár",
    name: "Kontaktný formulár",
    steps:
      "goto /kontakt\nfill input[name=email] test@example.com\nfill textarea Testovacia správa\nclick button[type=submit]\nexpectText Ďakujeme",
  },
  {
    label: "Prihlásenie",
    name: "Prihlásenie",
    steps:
      "goto /login\nfill input[name=email] test@example.com\nfill input[name=password] heslo123\nclick button[type=submit]\nexpectText Odhlásiť",
  },
  {
    label: "Košík / objednávka",
    name: "Objednávka",
    steps:
      "goto /\nclick text=Do košíka\nexpectSelector .cart\nclick text=Objednať\nexpectText Ďakujeme za objednávku",
  },
];

type Step = { type: string; selector?: string; value?: string };
type BrowserTest = {
  id: string;
  name: string;
  steps: Step[];
  enabled: boolean;
};
type Run = {
  id: string;
  test_id: string;
  ok: boolean;
  error: string | null;
  failed_step: number | null;
  duration_ms: number | null;
  created_at: string;
};

// Parses the simple line format into structured steps.
function parseSteps(text: string): Step[] {
  const steps: Step[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const [type, ...rest] = line.split(/\s+/);
    const remainder = rest.join(" ");
    switch (type) {
      case "goto":
      case "expectText":
      case "expectSelector":
      case "click":
      case "wait":
        steps.push(
          type === "click" || type === "expectSelector"
            ? { type, selector: remainder }
            : { type, value: remainder },
        );
        break;
      case "fill": {
        steps.push({ type, selector: rest[0], value: rest.slice(1).join(" ") });
        break;
      }
      default:
        break;
    }
  }
  return steps;
}

function stepsToText(steps: Step[]): string {
  return steps
    .map((s) => {
      if (s.type === "fill") return `fill ${s.selector} ${s.value ?? ""}`.trim();
      if (s.type === "click" || s.type === "expectSelector")
        return `${s.type} ${s.selector ?? ""}`.trim();
      return `${s.type} ${s.value ?? ""}`.trim();
    })
    .join("\n");
}

const PLACEHOLDER = `goto /kontakt
fill #email test@example.com
fill textarea Ahoj, toto je test
click button[type=submit]
expectText Ďakujeme`;

function TestsView() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  const [tests, setTests] = useState<BrowserTest[]>([]);
  const [runs, setRuns] = useState<Record<string, Run>>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiDesc, setAiDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function generate() {
    if (!id || !aiDesc.trim()) return;
    setGenerating(true);
    setGenError(null);
    try {
      const r = await generateTest(id, aiDesc.trim());
      if (r.name) setName(r.name);
      setStepsText(
        r.steps
          .map((s) => {
            if (s.type === "fill")
              return `fill ${s.selector} ${s.value ?? ""}`.trim();
            if (s.type === "click" || s.type === "expectSelector")
              return `${s.type} ${s.selector ?? ""}`.trim();
            return `${s.type} ${s.value ?? ""}`.trim();
          })
          .join("\n"),
      );
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generovanie zlyhalo.");
    } finally {
      setGenerating(false);
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
    const { data: t } = await supabase
      .from("browser_tests")
      .select("id, name, steps, enabled")
      .eq("project_id", id)
      .order("created_at", { ascending: true });
    const list = (t ?? []) as BrowserTest[];
    setTests(list);

    if (list.length) {
      const { data: r } = await supabase
        .from("browser_test_runs")
        .select("id, test_id, ok, error, failed_step, duration_ms, created_at")
        .in(
          "test_id",
          list.map((x) => x.id),
        )
        .order("created_at", { ascending: false });
      const latest: Record<string, Run> = {};
      for (const run of (r ?? []) as Run[]) {
        if (!latest[run.test_id]) latest[run.test_id] = run;
      }
      setRuns(latest);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function addTest() {
    if (!id || !name.trim()) return;
    const steps = parseSteps(stepsText);
    if (steps.length === 0) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("browser_tests").insert({
        project_id: id,
        user_id: user.id,
        name: name.trim(),
        steps,
      });
      setName("");
      setStepsText("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(testId: string) {
    const supabase = createClient();
    await supabase.from("browser_tests").delete().eq("id", testId);
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Načítavam…</p>;

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Prehliadačové testy
      </h1>
      <p className="mb-8 text-sm text-muted">
        Reálne preklikanie webu (Playwright). Testy bežia automaticky každých 6
        hodín cez GitHub Actions a po pridaní sa dajú spustiť aj ručne v záložke
        Actions na GitHube.
      </p>

      <div className="mb-8 rounded-2xl border border-border bg-surface p-6">
        <p className="mb-3 font-medium">Nový test</p>

        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <label className="block text-sm font-medium">
            Vygenerovať AI z popisu
          </label>
          <p className="mb-2 text-xs text-muted">
            Napíš bežnou rečou, čo overiť — Claude si pozrie stránku a napíše
            kroky.
          </p>
          <div className="flex gap-2">
            <Input
              id="aidesc"
              name="aidesc"
              placeholder="Over, že rezervačný formulár funguje a zobrazí poďakovanie"
              value={aiDesc}
              onChange={(e) => setAiDesc(e.target.value)}
              className="flex-1"
            />
            <Button onClick={generate} disabled={generating || !aiDesc.trim()}>
              {generating ? "Generujem…" : "Vygenerovať"}
            </Button>
          </div>
          {genError && <p className="mt-2 text-sm text-danger">{genError}</p>}
        </div>

        <label className="mb-1 block text-sm font-medium text-muted">
          Alebo vyber šablónu
        </label>
        <select
          onChange={(e) => {
            const p = PRESETS[Number(e.target.value)];
            if (p && p.steps) {
              setName(p.name);
              setStepsText(p.steps);
            }
          }}
          className="mb-5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          defaultValue="0"
        >
          {PRESETS.map((p, i) => (
            <option key={i} value={i}>
              {p.label}
            </option>
          ))}
        </select>

        <Input
          id="tname"
          label="Názov"
          placeholder="Kontaktný formulár"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="mt-4 block text-sm font-medium text-muted">
          Kroky (jeden na riadok)
        </label>
        <textarea
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
        />
        <p className="mt-2 text-xs text-muted">
          Podporované: <code>goto /cesta</code>, <code>click selektor</code>,{" "}
          <code>fill selektor hodnota</code>, <code>expectText text</code>,{" "}
          <code>expectSelector selektor</code>, <code>wait ms</code>
        </p>
        <div className="mt-4">
          <Button onClick={addTest} disabled={saving || !name.trim()}>
            {saving ? "Ukladám…" : "Pridať test"}
          </Button>
        </div>
      </div>

      {tests.length === 0 ? (
        <p className="text-sm text-muted">Zatiaľ žiadne testy.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tests.map((t) => {
            const run = runs[t.id];
            return (
              <li
                key={t.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-center gap-3">
                  {run ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        run.ok
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-danger/15 text-danger"
                      }`}
                    >
                      {run.ok ? "PASS" : "FAIL"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
                      ešte nebežal
                    </span>
                  )}
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted">
                    {t.steps.length} krokov
                  </span>
                  <button
                    onClick={() => remove(t.id)}
                    className="ml-auto text-xs text-muted hover:text-danger"
                  >
                    Zmazať
                  </button>
                </div>
                {run && !run.ok && (
                  <p className="mt-2 text-sm text-danger">
                    Zlyhal krok {run.failed_step}: {run.error}
                  </p>
                )}
                {run && (
                  <p className="mt-1 text-xs text-muted">
                    Posledný beh:{" "}
                    {new Date(run.created_at).toLocaleString("sk-SK")}
                    {run.duration_ms ? ` · ${run.duration_ms} ms` : ""}
                  </p>
                )}
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-surface-2 p-3 font-mono text-xs text-foreground/70">
                  {stepsToText(t.steps)}
                </pre>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function TestsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-foreground"
          >
            ← Späť na projekty
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Suspense fallback={<p className="text-sm text-muted">Načítavam…</p>}>
          <TestsView />
        </Suspense>
      </main>
    </div>
  );
}
