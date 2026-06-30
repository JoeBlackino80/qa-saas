"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/toaster";
import { fixFor } from "@/lib/fixes";
import type { SecurityFinding } from "@/lib/security-client";

type Props = {
  projectName: string;
  baseUrl: string;
  findings: SecurityFinding[];
  brokenLinks?: { url: string; status: number }[] | null;
};

function compose(
  name: string,
  url: string,
  findings: SecurityFinding[],
  broken?: { url: string; status: number }[] | null,
): string {
  const order = { high: 0, medium: 1, low: 2, ok: 3 } as const;
  const issues = findings
    .filter((f) => f.severity !== "ok")
    .sort((a, b) => order[a.severity] - order[b.severity]);

  const lines: string[] = [
    "Dobrý deň,",
    "",
    `prosím o úpravu nastavení webu ${url}. Kontrola našla nasledujúce body — pri každom je uvedené, čo presne treba spraviť:`,
    "",
  ];

  issues.forEach((f, i) => {
    const fix = fixFor(f.title);
    lines.push(`${i + 1}) ${f.title}`);
    lines.push(`   Problém: ${f.detail}`);
    if (fix) {
      lines.push(`   Riešenie: ${fix.how}`);
      if (fix.code) {
        lines.push("   Kód / záznam na vloženie:");
        for (const c of fix.code.split("\n")) lines.push(`      ${c}`);
      }
    }
    lines.push("");
  });

  if (broken && broken.length > 0) {
    lines.push("Rozbité odkazy (404) — opraviť alebo odstrániť:");
    for (const l of broken) lines.push(`   - ${l.url}`);
    lines.push("");
  }

  lines.push(
    "Vopred ďakujem za úpravu. V prípade otázok ma kontaktujte.",
    "",
    "S pozdravom",
  );
  return lines.join("\n");
}

export function FixRequest({
  projectName,
  baseUrl,
  findings,
  brokenLinks,
}: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");

  const issueCount = useMemo(
    () => findings.filter((f) => f.severity !== "ok").length,
    [findings],
  );
  const subject = `Úprava webu ${projectName} — ${issueCount} ${issueCount === 1 ? "bod" : issueCount < 5 ? "body" : "bodov"} na opravu`;
  const [body, setBody] = useState("");

  function openModal() {
    setBody(compose(projectName, baseUrl, findings, brokenLinks));
    setOpen(true);
  }

  if (issueCount === 0) return null;

  return (
    <>
      <Button variant="ghost" onClick={openModal}>
        Poslať správcovi
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Poslať návod na opravu
                </h3>
                <p className="mt-0.5 text-sm text-muted">
                  Hotová správa pre webmastera alebo hosting — klient ju len
                  prepošle. Žiadne heslá netreba.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted transition-colors hover:text-foreground"
                aria-label="Zavrieť"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3 overflow-hidden">
              <Input
                id="fix_to"
                name="fix_to"
                type="email"
                label="E-mail správcu / hostingu (nepovinné)"
                placeholder="webmaster@hosting.sk"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <div className="flex flex-1 flex-col overflow-hidden">
                <label
                  htmlFor="fix_body"
                  className="mb-1.5 text-sm font-medium text-muted"
                >
                  Správa (môžeš upraviť)
                </label>
                <textarea
                  id="fix_body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[220px] flex-1 resize-none rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs leading-relaxed text-foreground/90 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(body);
                  toast("Správa skopírovaná.", "success");
                }}
              >
                Kopírovať
              </Button>
              <a
                href={`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
              >
                <Button>Otvoriť v e-maile</Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
