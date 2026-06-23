"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const FEATURES: { title: string; desc: string }[] = [
  {
    title: "Monitoring dostupnosti",
    desc: "Kontrola každých 15 minút — stav, čas odozvy, uptime a história. Vie, keď web spadne, skôr než zákazník.",
  },
  {
    title: "Sémantický monitoring",
    desc: "Nielen „je hore“ — deteguje, keď zmizne formulár, obrázky či obsah, hoci web vracia 200.",
  },
  {
    title: "Bezpečnostný audit",
    desc: "Známka A–F: hlavičky, TLS, cookies, DNS (SPF/DMARC/DNSSEC), odhalené súbory — s AI odporúčaniami.",
  },
  {
    title: "Výkon a stabilita",
    desc: "Lighthouse skóre (výkon, prístupnosť, SEO), rozbité odkazy a kontrola blacklistu.",
  },
  {
    title: "Prehliadačové testy",
    desc: "Reálne preklikanie webu (formulár, košík, prihlásenie). Test napíšeš slovami, AI ho vytvorí.",
  },
  {
    title: "AI reporty a status page",
    desc: "Zrozumiteľné reporty pre klienta (PDF), verejný status page a upozornenia pri výpadku.",
  },
];

const PLANS: {
  name: string;
  price: string;
  note: string;
  items: string[];
  highlight?: boolean;
}[] = [
  {
    name: "Free",
    price: "0 €",
    note: "na vyskúšanie",
    items: ["1 projekt", "Monitoring + AI report", "Bezpečnostný audit"],
  },
  {
    name: "Pro",
    price: "19 €",
    note: "mesačne",
    highlight: true,
    items: [
      "Neobmedzene projektov",
      "Všetky audity + výkon",
      "Prehliadačové testy",
      "Status page + alerty",
      "Klientske PDF reporty",
    ],
  },
  {
    name: "Agency",
    price: "49 €",
    note: "mesačne",
    items: [
      "Všetko z Pro",
      "Branding pre klientov",
      "Tímy a viac používateľov",
      "Prioritná podpora",
    ],
  },
];

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
      else setReady(true);
    });
  }, [router]);

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Načítavam…</p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">
              QA
            </span>
            <span className="font-semibold">QA Agent</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Prihlásiť sa</Button>
            </Link>
            <Link href="/signup">
              <Button>Registrácia</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-3xl animate-in px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Monitoring, testovanie a audit webov — s AI
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            QA Agent ti nepovie len že web spadol, ale aj{" "}
            <span className="text-foreground">čo presne sa pokazilo</span>, aké
            má bezpečnostné a výkonnostné slabiny a ako to opraviť.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/signup">
              <Button className="px-6 py-3 text-base">Začať zadarmo</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="px-6 py-3 text-base">
                Prihlásiť sa
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Cenník
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-6 ${
                  p.highlight
                    ? "border-primary bg-surface"
                    : "border-border bg-surface"
                }`}
              >
                <p className="text-sm font-medium text-muted">{p.name}</p>
                <p className="mt-2">
                  <span className="tabular text-3xl font-semibold">
                    {p.price}
                  </span>{" "}
                  <span className="text-sm text-muted">{p.note}</span>
                </p>
                <ul className="mt-5 flex flex-col gap-2 text-sm text-foreground/80">
                  {p.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {it}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-6 block">
                  <Button
                    variant={p.highlight ? "primary" : "ghost"}
                    className="w-full"
                  >
                    Vybrať {p.name}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Ceny sú orientačné — fakturácia (Stripe) pribudne čoskoro.
          </p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 text-center text-sm text-muted">
          QA Agent — web quality, security &amp; performance
        </div>
      </footer>
    </div>
  );
}
