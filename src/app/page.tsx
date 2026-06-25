"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const PAINS: { t: string; d: string }[] = [
  {
    t: "Web spadne a ty o tom nevieš",
    d: "Kým si to všimneš (alebo ti zavolá nahnevaný klient), môžu ubehnúť hodiny. Každá minúta výpadku = stratení zákazníci a poškodená dôvera.",
  },
  {
    t: "Formulár prestane fungovať — potichu",
    d: "Web vyzerá v poriadku, vracia „200 OK“, ale objednávkový či kontaktný formulár je rozbitý. Dopyty sa strácajú a nikto nič netuší.",
  },
  {
    t: "Bezpečnostné diery a pomalý web",
    d: "Chýbajúce HTTPS hlavičky, neplatný certifikát, pomalé načítanie — to odrádza návštevníkov aj Google. A ty to bez nástroja jednoducho nevidíš.",
  },
];

type Feature = { t: string; d: string; long: string; example: string[] };

const FEATURES: Feature[] = [
  {
    t: "Monitoring dostupnosti 24/7",
    d: "Sledujeme tvoj web každých 15 minút, deň aj noc. Vieš o výpadku ako prvý — nie od zákazníka. K tomu rýchlosť odozvy, uptime a história.",
    long: "Tvoj web kontrolujeme automaticky každých 15 minút z našich serverov — funguje to, aj keď máš počítač vypnutý. Meriame dostupnosť, HTTP status a presný čas odozvy. Keď web spadne, pošleme ti upozornenie do pár minút (Slack, Discord, e-mail alebo pop-up na ploche). Vidíš uptime v percentách, graf rýchlosti v čase a kompletnú históriu — takže presne vieš, kedy a ako dlho bol web nedostupný.",
    example: [
      "Stav: Online · Uptime 99,8 % · Odozva 240 ms",
      "Upozornenie: web nedostupný o 14:32 (HTTP 503)",
      "Graf odozvy za posledných 50 kontrol",
    ],
  },
  {
    t: "Kontrola, či web naozaj funguje",
    d: "Nielen „je hore“. Zistíme, keď zmizne formulár, obrázky alebo obsah — chyby, ktoré bežný monitoring prehliadne, no zákazníka odplašia.",
    long: "Bežný monitoring povie len „web vrátil 200 OK“. My ideme ďalej — porovnávame obsah stránky a upozorníme, keď sa stane niečo dôležité: zmizne kontaktný či objednávkový formulár, vypadnú obrázky, výrazne ubudne textu alebo sa zmení titulok. To sú chyby, ktoré web navonok „funguje“, no v skutočnosti strácaš cez ne dopyty a zákazníkov.",
    example: [
      "Kritické: Zmizol formulár — web je hore, ale formulár tam nie je",
      "Varovanie: Zo stránky zmizli všetky obrázky",
      "Info: Titulok sa zmenil",
    ],
  },
  {
    t: "Bezpečnostný audit so známkou A–F",
    d: "Preveríme HTTPS, certifikát, bezpečnostné hlavičky, cookies, DNS a odhalené citlivé súbory. Dostaneš jasnú známku a zoznam, čo opraviť.",
    long: "Jedným klikom preveríme bezpečnosť webu a dáme mu známku A–F. Kontrolujeme HTTPS a platnosť certifikátu, bezpečnostné hlavičky (HSTS, CSP, X-Frame-Options…), nastavenie cookies, DNS záznamy (SPF, DMARC, DNSSEC) aj to, či nie sú verejne prístupné citlivé súbory ako .env či .git. K tomu dostaneš AI zhrnutie po slovensky — čo to znamená a čo opraviť ako prvé. Ideálny podklad pre klienta.",
    example: [
      "Známka: F (34/100)",
      "Chýba HSTS, CSP, ochrana proti clickjackingu",
      "AI: „Najprv vynúť HTTPS, potom zabezpeč cookies…“",
    ],
  },
  {
    t: "Výkon a SEO (Lighthouse)",
    d: "Rýchlosť, prístupnosť, SEO a najlepšie praktiky v číslach. Plus kontrola rozbitých odkazov a blacklistu. Vieš, kde web stráca návštevníkov.",
    long: "Zmeriame výkon webu cez Google Lighthouse — rýchlosť načítania (Core Web Vitals), prístupnosť, SEO a najlepšie praktiky, všetko v skóre 0–100. Navyše prejdeme web a nájdeme rozbité odkazy (404) a overíme, či doména nie je na zozname škodlivých stránok. Pomalý web odrádza návštevníkov aj Google — toto ti presne ukáže, kde strácaš a čo zlepšiť.",
    example: [
      "Výkon 80 · Prístupnosť 81 · Best practices 77 · SEO 100",
      "Rozbité odkazy: 4 (chýba favicon, manifest…)",
      "Blacklist: čistý",
    ],
  },
  {
    t: "Reálne testy v prehliadači",
    d: "Otestujeme kľúčové procesy ako skutočný používateľ — prihlásenie, formulár, košík. Test napíšeš bežnou rečou a AI ho vytvorí za teba.",
    long: "Skutočne preklikáme web ako reálny zákazník — vyplníme formulár, klikneme na tlačidlo, prejdeme objednávku — a overíme, že to naozaj funguje (nielen že sa stránka načíta). Test nemusíš vedieť programovať: napíšeš bežnou rečou, čo overiť, a AI ho vytvorí za teba. Testy bežia automaticky každých 6 hodín a hneď vieš, keď sa niektorý kľúčový proces pokazí.",
    example: [
      "Napíšeš: „Over, že rezervačný formulár funguje a zobrazí poďakovanie“",
      "AI vytvorí kroky a spustí test",
      "Výsledok: PASS / FAIL pri každom teste",
    ],
  },
  {
    t: "Reporty a upozornenia",
    d: "Zrozumiteľné AI reporty pre klienta (aj PDF), verejný status page a okamžité upozornenia, keď sa niečo pokazí. Bez technického žargónu.",
    long: "Z dát urobíme zrozumiteľný report pre majiteľa webu — v slovenčine, bez žargónu, exportovateľný do PDF s tvojím menom. Pre klienta vieš zapnúť aj verejný status page, kde vidí stav svojho webu naživo. A keď sa niečo pokazí, pošleme upozornenie tam, kde to uvidíš: Slack, Discord, e-mail alebo pop-up notifikácia na ploche.",
    example: [
      "Týždenný PDF report: „Web bežal 99,9 %, načítaval sa za 0,4 s…“",
      "Verejný status page pre klienta",
      "Okamžité alerty pri výpadku",
    ],
  },
];

const FOR_WHOM: { t: string; d: string }[] = [
  {
    t: "Webové agentúry",
    d: "Stráž weby všetkých klientov z jedného miesta. Posielaj im profesionálne reporty a status page s tvojím menom — pridaná hodnota, za ktorú zaplatia.",
  },
  {
    t: "E-shopy a firmy",
    d: "Maj istotu, že objednávky chodia, web je rýchly a bezpečný. Keď sa niečo pokazí, dozvieš sa to hneď — nie keď klesnú tržby.",
  },
  {
    t: "Freelanceri a správcovia webov",
    d: "Spravuješ weby pre klientov? Ukáž im, že na ne dávaš pozor. Automatické audity a reporty robia tvoju prácu viditeľnou.",
  },
];

const STEPS: { n: string; t: string; d: string }[] = [
  {
    n: "1",
    t: "Pridáš web",
    d: "Stačí názov a adresa. Za pár sekúnd je projekt pripravený.",
  },
  {
    n: "2",
    t: "Monitorujeme a auditujeme",
    d: "Automaticky kontrolujeme dostupnosť, bezpečnosť, výkon aj funkčnosť — bez tvojho zásahu.",
  },
  {
    n: "3",
    t: "Dostaneš výsledky a alerty",
    d: "Prehľadné reporty, status page a upozornenia. Vieš presne, čo a kedy opraviť.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Musím byť technik, aby som to používal?",
    a: "Nie. Reporty sú písané v zrozumiteľnej slovenčine s konkrétnymi odporúčaniami. Čo treba opraviť, prepošleš svojmu správcovi webu alebo hostingu.",
  },
  {
    q: "Ako rýchlo sa dozviem o výpadku?",
    a: "Web kontrolujeme každých 15 minút a pri výpadku ti pošleme okamžité upozornenie (Slack, Discord, e-mail).",
  },
  {
    q: "Je bezpečnostný audit bezpečný pre môj web?",
    a: "Áno. Robíme výhradne pasívnu analýzu — žiadne útoky ani záťažové testy. Analyzujeme len to, čo web sám zverejňuje, ako renomované nástroje.",
  },
  {
    q: "Koľko webov môžem sledovať?",
    a: "V pláne Pro neobmedzene. Free plán je na vyskúšanie s jedným projektom.",
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
      "Všetky audity + výkon (Lighthouse)",
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
  const [openFeature, setOpenFeature] = useState<Feature | null>(null);

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
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
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
        <section className="mx-auto w-full max-w-3xl animate-in px-6 pt-24 pb-16 text-center">
          <span className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            Monitoring · Bezpečnosť · Výkon · Testy — s AI
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Tvoj web pod kontrolou 24 hodín denne
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            QA Agent ti nepovie len že web spadol, ale aj{" "}
            <span className="text-foreground">
              čo presne sa pokazilo, kde je zraniteľný a ako to opraviť
            </span>{" "}
            — zrozumiteľne, s umelou inteligenciou, na jednom mieste.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/signup">
              <Button className="px-6 py-3 text-base">Začať zadarmo</Button>
            </Link>
            <Link href="#funkcie">
              <Button variant="ghost" className="px-6 py-3 text-base">
                Ako to funguje
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Bez inštalácie · pridáš web a sledujeme za teba
          </p>
        </section>

        {/* Pains */}
        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Toto sa deje, keď web nikto nestráži
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {PAINS.map((p) => (
                <div
                  key={p.t}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <h3 className="font-medium text-danger">{p.t}</h3>
                  <p className="mt-2 text-sm text-muted">{p.d}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-8 max-w-xl text-center text-muted">
              QA Agent tieto problémy <span className="text-foreground">zachytí ako prvý</span> a
              povie ti presne, čo s tým.
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="funkcie" className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Všetko, čo potrebuješ na zdravý web
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted">
            Šesť nástrojov v jednom — namiesto piatich rôznych služieb a
            mesačných poplatkov.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <button
                key={f.t}
                onClick={() => setOpenFeature(f)}
                className="rounded-2xl border border-border bg-surface p-6 text-left transition-colors hover:border-primary/40"
              >
                <h3 className="font-medium">{f.t}</h3>
                <p className="mt-2 text-sm text-muted">{f.d}</p>
                <span className="mt-3 inline-block text-sm font-medium text-primary">
                  Zistiť viac →
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* For whom */}
        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Pre koho je QA Agent
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {FOR_WHOM.map((f) => (
                <div
                  key={f.t}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <h3 className="font-medium">{f.t}</h3>
                  <p className="mt-2 text-sm text-muted">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Ako to funguje
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <span className="tabular grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {s.n}
                </span>
                <h3 className="mt-4 font-medium">{s.t}</h3>
                <p className="mt-2 text-sm text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why us */}
        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Prečo QA Agent
            </h2>
            <div className="mt-8 grid gap-6 text-left sm:grid-cols-2">
              <div>
                <h3 className="font-medium">Vysvetlí to ľudsky</h3>
                <p className="mt-1 text-sm text-muted">
                  Žiadne tabuľky plné čísel. AI ti povie po slovensky, čo
                  problém znamená a čo opraviť ako prvé.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Všetko na jednom mieste</h3>
                <p className="mt-1 text-sm text-muted">
                  Dostupnosť, bezpečnosť, výkon aj testy v jednej appke —
                  nemusíš platiť päť rôznych nástrojov.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Nájde, čo iní prehliadnu</h3>
                <p className="mt-1 text-sm text-muted">
                  Zmiznutý formulár, rozbitý certifikát, pomalá stránka — chyby,
                  ktoré stoja zákazníkov.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Pripravené pre klientov</h3>
                <p className="mt-1 text-sm text-muted">
                  Profesionálne reporty a status page, ktoré môžeš poslať
                  priamo klientovi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Jednoduchý cenník
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted">
            Začni zadarmo. Plať, až keď ti to prinesie hodnotu.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-6 ${
                  p.highlight
                    ? "border-primary bg-surface shadow-lg shadow-primary/10"
                    : "border-border bg-surface"
                }`}
              >
                {p.highlight && (
                  <span className="mb-3 inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                    Najpopulárnejší
                  </span>
                )}
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

        {/* FAQ */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-20">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Časté otázky
            </h2>
            <div className="mt-10 flex flex-col gap-4">
              {FAQ.map((f) => (
                <div
                  key={f.q}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <h3 className="font-medium">{f.q}</h3>
                  <p className="mt-2 text-sm text-muted">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Začni sledovať svoj web ešte dnes
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">
            Registrácia za minútu, bez karty. Pridaj prvý web a hneď uvidíš jeho
            stav, bezpečnosť aj rýchlosť.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button className="px-8 py-3 text-base">Vytvoriť účet zadarmo</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted sm:flex-row">
          <span>QA Agent — web quality, security &amp; performance</span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Prihlásiť sa
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Registrácia
            </Link>
          </div>
        </div>
      </footer>

      {openFeature && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpenFeature(null)}
        >
          <div
            className="w-full max-w-lg animate-in rounded-2xl border border-border bg-surface p-7 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold">{openFeature.t}</h3>
              <button
                onClick={() => setOpenFeature(null)}
                className="text-muted hover:text-foreground"
                aria-label="Zavrieť"
              >
                ✕
              </button>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80">
              {openFeature.long}
            </p>
            <div className="mt-5 rounded-xl border border-border bg-surface-2 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Ukážka
              </p>
              <ul className="flex flex-col gap-1.5">
                {openFeature.example.map((e, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80">
                    <span className="text-primary">•</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/signup" className="mt-6 block">
              <Button className="w-full">Vyskúšať zadarmo</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
