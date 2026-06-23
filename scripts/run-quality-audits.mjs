// Quality + stability audit: Lighthouse (performance/a11y/best-practices/seo),
// broken-link crawl, optional Google Safe Browsing blacklist check.
// Run by GitHub Actions (see .github/workflows/quality-audit.yml).
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, [GOOGLE_SAFE_BROWSING_KEY].
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import lighthouse from "lighthouse";

const SUMMARY = process.env.GITHUB_STEP_SUMMARY;
function log(m) {
  console.log(m);
  if (SUMMARY) try { appendFileSync(SUMMARY, m + "\n"); } catch { /* */ }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SAFE_BROWSING_KEY = process.env.GOOGLE_SAFE_BROWSING_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  log("CHYBA: chýba SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function pct(score) {
  return score == null ? null : Math.round(score * 100);
}

async function runLighthouse(url, port) {
  const result = await lighthouse(url, {
    port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  });
  const c = result.lhr.categories;
  return {
    performance: pct(c.performance?.score),
    accessibility: pct(c.accessibility?.score),
    best_practices: pct(c["best-practices"]?.score),
    seo: pct(c.seo?.score),
  };
}

async function checkBrokenLinks(baseUrl) {
  const broken = [];
  try {
    const res = await fetch(baseUrl, { headers: { "user-agent": "QA-Agent/1.0" } });
    const html = await res.text();
    const host = new URL(baseUrl).host;
    const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
    const links = [];
    for (const href of hrefs) {
      try {
        const u = new URL(href, baseUrl);
        if (u.protocol.startsWith("http") && u.host === host && !links.includes(u.toString()))
          links.push(u.toString());
      } catch { /* */ }
    }
    for (const link of links.slice(0, 30)) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        let r = await fetch(link, { method: "HEAD", redirect: "follow", signal: ctrl.signal, headers: { "user-agent": "QA-Agent/1.0" } });
        if (r.status === 405 || r.status === 501) r = await fetch(link, { redirect: "follow", signal: ctrl.signal });
        clearTimeout(t);
        if (r.status >= 400) broken.push({ url: link, status: r.status });
      } catch {
        broken.push({ url: link, status: 0 });
      }
    }
  } catch (e) {
    log("broken-link crawl failed: " + (e instanceof Error ? e.message : e));
  }
  return broken;
}

async function checkBlacklist(url) {
  if (!SAFE_BROWSING_KEY) return { blacklisted: null, detail: "Vyžaduje GOOGLE_SAFE_BROWSING_KEY." };
  try {
    const resp = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "qa-agent", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }],
          },
        }),
      },
    );
    const data = await resp.json();
    const listed = Array.isArray(data.matches) && data.matches.length > 0;
    return {
      blacklisted: listed,
      detail: listed ? data.matches.map((m) => m.threatType).join(", ") : "Čistý (Google Safe Browsing).",
    };
  } catch (e) {
    return { blacklisted: null, detail: "Kontrola zlyhala: " + (e instanceof Error ? e.message : e) };
  }
}

async function main() {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, base_url, user_id");
  if (error) { log("load projects failed: " + error.message); process.exit(1); }
  if (!projects?.length) { log("Žiadne projekty."); return; }

  const browser = await chromium.launch({ args: ["--remote-debugging-port=9222"] });
  try {
    for (const p of projects) {
      log(`— ${p.name} (${p.base_url})`);
      let scores = { performance: null, accessibility: null, best_practices: null, seo: null };
      try {
        scores = await runLighthouse(p.base_url, 9222);
      } catch (e) {
        log("  lighthouse failed: " + (e instanceof Error ? e.message : e));
      }
      const broken = await checkBrokenLinks(p.base_url);
      const bl = await checkBlacklist(p.base_url);

      await supabase.from("quality_audits").insert({
        project_id: p.id,
        user_id: p.user_id,
        performance: scores.performance,
        accessibility: scores.accessibility,
        best_practices: scores.best_practices,
        seo: scores.seo,
        broken_count: broken.length,
        broken_links: broken,
        blacklisted: bl.blacklisted,
        blacklist_detail: bl.detail,
      });
      log(`  perf ${scores.performance} a11y ${scores.accessibility} bp ${scores.best_practices} seo ${scores.seo} | rozbité ${broken.length} | blacklist ${bl.blacklisted}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  log("FATAL: " + (e instanceof Error ? e.stack : String(e)));
  process.exit(1);
});
