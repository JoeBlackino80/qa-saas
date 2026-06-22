// Runs all enabled browser tests with Playwright and writes results to Supabase.
// Executed by GitHub Actions (see .github/workflows/browser-tests.yml).
// Needs env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const SUMMARY = process.env.GITHUB_STEP_SUMMARY;
function log(msg) {
  console.log(msg);
  if (SUMMARY) {
    try {
      appendFileSync(SUMMARY, msg + "\n");
    } catch {
      // ignore
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

log(
  `env: SUPABASE_URL ${SUPABASE_URL ? `set (${SUPABASE_URL.length} chars)` : "MISSING"}, ` +
    `SUPABASE_SERVICE_ROLE_KEY ${SERVICE_KEY ? `set (${SERVICE_KEY.length} chars)` : "MISSING"}`,
);

if (!SUPABASE_URL || !SERVICE_KEY) {
  log("CHYBA: chýba SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY (GitHub secrets).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function resolveUrl(baseUrl, target) {
  if (!target) return baseUrl;
  if (/^https?:\/\//i.test(target)) return target;
  return new URL(target, baseUrl).toString();
}

async function runStep(page, baseUrl, step) {
  const timeout = 15000;
  switch (step.type) {
    case "goto":
      await page.goto(resolveUrl(baseUrl, step.value), {
        waitUntil: "domcontentloaded",
        timeout,
      });
      break;
    case "click":
      await page.click(step.selector, { timeout });
      break;
    case "fill":
      await page.fill(step.selector, step.value ?? "", { timeout });
      break;
    case "expectText":
      await page
        .getByText(step.value, { exact: false })
        .first()
        .waitFor({ timeout });
      break;
    case "expectSelector":
      await page.locator(step.selector).first().waitFor({ timeout });
      break;
    case "wait":
      await page.waitForTimeout(Math.min(Number(step.value) || 1000, 10000));
      break;
    default:
      throw new Error(`Neznámy typ kroku: ${step.type}`);
  }
}

async function main() {
  log("Loading enabled tests…");
  const { data: tests, error } = await supabase
    .from("browser_tests")
    .select("id, project_id, user_id, name, steps, projects(base_url)")
    .eq("enabled", true);

  if (error) {
    log("CHYBA pri načítaní testov: " + JSON.stringify(error));
    process.exit(1);
  }

  log(`Načítaných ${tests?.length ?? 0} testov.`);
  if (!tests || tests.length === 0) {
    log("Žiadne aktívne testy — infraštruktúra OK, niet čo spustiť.");
    return;
  }

  const browser = await chromium.launch();
  try {
    for (const t of tests) {
      const baseUrl = t.projects?.base_url ?? "";
      const steps = Array.isArray(t.steps) ? t.steps : [];
      const start = Date.now();
      let ok = true;
      let errMsg = null;
      let failedStep = null;

      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        for (let i = 0; i < steps.length; i++) {
          try {
            await runStep(page, baseUrl, steps[i]);
          } catch (e) {
            ok = false;
            failedStep = i + 1;
            errMsg = e instanceof Error ? e.message : String(e);
            break;
          }
        }
      } finally {
        await context.close();
      }

      const duration = Date.now() - start;
      await supabase.from("browser_test_runs").insert({
        test_id: t.id,
        project_id: t.project_id,
        user_id: t.user_id,
        ok,
        error: errMsg,
        failed_step: failedStep,
        duration_ms: duration,
      });
      log(
        `${ok ? "PASS" : "FAIL"}  ${t.name}  (${duration}ms)${errMsg ? " — " + errMsg : ""}`,
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  log("FATAL: " + (e instanceof Error ? e.stack : String(e)));
  process.exit(1);
});
