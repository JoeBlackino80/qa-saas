"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

const ACCENTS = [
  "bg-indigo-50 text-indigo-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
  "bg-amber-50 text-amber-600",
  "bg-violet-50 text-violet-600",
  "bg-sky-50 text-sky-600",
];

function FeatureIcon({ i }: { i: number }) {
  const paths = [
    "M3 12h4l2.5 7 4-15L16 12h5", // activity
    "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z M12 12.01", // eye (+ pupil)
    "M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6l7-3z M9 12l2 2 4-4", // shield-check
    "M13 3L4 14h6l-1 7 9-11h-6l1-7z", // bolt
    "M9 12l2 2 4-4 M12 3a9 9 0 100 18 9 9 0 000-18z", // check circle
    "M6 3h9l5 5v13H6z M14 3v5h5 M9 13h6 M9 17h6", // document
  ];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {paths[i].split(" M").map((seg, k) => (
        <path key={k} d={(k === 0 ? "" : "M") + seg} />
      ))}
    </svg>
  );
}

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700";
const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50";

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
      <main className="flex min-h-screen flex-1 items-center justify-center bg-white">
        <p className="text-sm text-slate-400">Načítavam…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              QA
            </span>
            <span className="font-semibold tracking-tight">QA Agent</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Prihlásiť sa
            </Link>
            <Link href="/signup" className={`${btnPrimary} px-4 py-2 text-sm`}>
              Registrácia
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* soft gradient blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-sky-200/40 blur-3xl"
          />
          <div className="relative mx-auto w-full max-w-3xl animate-in px-6 pt-20 pb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Monitoring · Bezpečnosť · Výkon · Testy — s AI
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
              Tvoj web pod kontrolou
              <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                24 hodín denne
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              QA Agent ti nepovie len že web spadol, ale aj{" "}
              <span className="font-medium text-slate-900">
                čo presne sa pokazilo, kde je zraniteľný a ako to opraviť
              </span>{" "}
              — zrozumiteľne, s umelou inteligenciou, na jednom mieste.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className={`${btnPrimary} px-6 py-3 text-base`}>
                Začať zadarmo
              </Link>
              <Link
                href="#funkcie"
                className={`${btnSecondary} px-6 py-3 text-base`}
              >
                Ako to funguje
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Bez inštalácie · bez karty · pridáš web a sledujeme za teba
            </p>
          </div>

          {/* Product preview mock */}
          <div className="relative mx-auto -mb-px w-full max-w-4xl px-6 pb-16">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/40 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      eshop-klienta.sk
                    </p>
                    <p className="text-xs text-slate-400">
                      posledná kontrola pred 3 min
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                  Všetko funguje
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr]">
                <div className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white p-5 ring-1 ring-emerald-100">
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-4xl font-bold text-emerald-600 shadow-sm">
                    A
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Celková známka
                    </p>
                    <p className="text-2xl font-bold text-slate-900">92/100</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Dostupnosť", "99,9 %", "text-emerald-600"],
                    ["Bezpečnosť", "A", "text-emerald-600"],
                    ["Výkon", "90", "text-emerald-600"],
                  ].map(([l, v, c]) => (
                    <div
                      key={l}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        {l}
                      </p>
                      <p className={`mt-1 text-xl font-bold ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-end gap-1">
                {Array.from({ length: 45 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-7 flex-1 rounded-sm ${
                      i === 18 || i === 31 ? "bg-rose-400" : "bg-emerald-400/80"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Uptime za posledných 45 dní
              </p>
            </div>
          </div>
        </section>

        {/* Value strip */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4">
            {[
              ["6", "nástrojov v jednej appke"],
              ["15 min", "interval kontroly webu"],
              ["A–F", "jasná známka, žiadny žargón"],
              ["AI", "vysvetlí a poradí po slovensky"],
            ].map(([big, small]) => (
              <div key={small} className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{big}</p>
                <p className="mt-1 text-sm text-slate-500">{small}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pains */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Toto sa deje, keď web nikto nestráži
            </h2>
            <p className="mt-3 text-slate-600">
              Tiché chyby, ktoré stoja zákazníkov skôr, než si ich všimneš.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PAINS.map((p) => (
              <div
                key={p.t}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    className="h-5 w-5"
                  >
                    <path d="M12 9v4M12 17h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
                  </svg>
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {p.d}
                </p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-xl text-center text-slate-600">
            QA Agent tieto problémy{" "}
            <span className="font-semibold text-slate-900">zachytí ako prvý</span>{" "}
            a povie ti presne, čo s tým.
          </p>
        </section>

        {/* Features */}
        <section id="funkcie" className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Všetko, čo potrebuješ na zdravý web
              </h2>
              <p className="mt-3 text-slate-600">
                Šesť nástrojov v jednom — namiesto piatich rôznych služieb a
                mesačných poplatkov.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <button
                  key={f.t}
                  onClick={() => setOpenFeature(f)}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                >
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl ${ACCENTS[i % ACCENTS.length]}`}
                  >
                    <FeatureIcon i={i} />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{f.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {f.d}
                  </p>
                  <span className="mt-3 inline-block text-sm font-semibold text-indigo-600 transition group-hover:translate-x-0.5">
                    Zistiť viac →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* For whom */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Pre koho je QA Agent
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {FOR_WHOM.map((f) => (
              <div
                key={f.t}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="font-semibold text-slate-900">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {f.d}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-5xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Ako to funguje</h2>
              <p className="mt-3 text-slate-600">Tri kroky, dve minúty.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    {s.n}
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {s.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why us */}
        <section className="mx-auto w-full max-w-4xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Prečo QA Agent</h2>
          </div>
          <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {[
              [
                "Vysvetlí to ľudsky",
                "Žiadne tabuľky plné čísel. AI ti povie po slovensky, čo problém znamená a čo opraviť ako prvé.",
              ],
              [
                "Všetko na jednom mieste",
                "Dostupnosť, bezpečnosť, výkon aj testy v jednej appke — nemusíš platiť päť rôznych nástrojov.",
              ],
              [
                "Nájde, čo iní prehliadnu",
                "Zmiznutý formulár, rozbitý certifikát, pomalá stránka — chyby, ktoré stoja zákazníkov.",
              ],
              [
                "Pripravené pre klientov",
                "Profesionálne reporty a status page, ktoré môžeš poslať priamo klientovi.",
              ],
            ].map(([t, d]) => (
              <div key={t} className="flex gap-3.5">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M5 12l4 4 10-10" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Jednoduchý cenník
              </h2>
              <p className="mt-3 text-slate-600">
                Začni zadarmo. Plať, až keď ti to prinesie hodnotu.
              </p>
            </div>
            <div className="mt-12 grid items-start gap-5 md:grid-cols-3">
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className={`rounded-2xl p-6 ${
                    p.highlight
                      ? "border-2 border-indigo-600 bg-white shadow-xl shadow-indigo-600/10 md:-translate-y-2"
                      : "border border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  {p.highlight && (
                    <span className="mb-3 inline-block rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      Najpopulárnejší
                    </span>
                  )}
                  <p className="text-sm font-semibold text-slate-500">
                    {p.name}
                  </p>
                  <p className="mt-2">
                    <span className="text-4xl font-bold tracking-tight text-slate-900">
                      {p.price}
                    </span>{" "}
                    <span className="text-sm text-slate-500">{p.note}</span>
                  </p>
                  <ul className="mt-6 flex flex-col gap-2.5 text-sm text-slate-700">
                    {p.items.map((it) => (
                      <li key={it} className="flex gap-2.5">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600"
                        >
                          <path d="M5 12l4 4 10-10" />
                        </svg>
                        {it}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-7 block w-full px-4 py-2.5 text-center text-sm ${
                      p.highlight ? btnPrimary : btnSecondary
                    }`}
                  >
                    Vybrať {p.name}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-slate-500">
              Ceny sú orientačné — fakturácia (Stripe) pribudne čoskoro.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-3xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Časté otázky</h2>
          </div>
          <div className="mt-12 flex flex-col gap-4">
            {FAQ.map((f) => (
              <div
                key={f.q}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="font-semibold text-slate-900">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-20">
          <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-16 text-center shadow-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
            />
            <h2 className="relative text-3xl font-bold tracking-tight text-white">
              Začni sledovať svoj web ešte dnes
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-indigo-100">
              Registrácia za minútu, bez karty. Pridaj prvý web a hneď uvidíš
              jeho stav, bezpečnosť aj rýchlosť.
            </p>
            <div className="relative mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3 text-base font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
              >
                Vytvoriť účet zadarmo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <span>QA Agent — web quality, security &amp; performance</span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-slate-900">
              Prihlásiť sa
            </Link>
            <Link href="/signup" className="hover:text-slate-900">
              Registrácia
            </Link>
          </div>
        </div>
      </footer>

      {openFeature && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setOpenFeature(null)}
        >
          <div
            className="w-full max-w-lg animate-in rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {openFeature.t}
              </h3>
              <button
                onClick={() => setOpenFeature(null)}
                className="text-slate-400 transition hover:text-slate-900"
                aria-label="Zavrieť"
              >
                ✕
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {openFeature.long}
            </p>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Ukážka
              </p>
              <ul className="flex flex-col gap-1.5">
                {openFeature.example.map((e, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-indigo-600">•</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/signup"
              className={`mt-6 block w-full px-4 py-2.5 text-center text-sm ${btnPrimary}`}
            >
              Vyskúšať zadarmo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
