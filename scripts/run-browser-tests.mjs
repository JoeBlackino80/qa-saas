// Runs all enabled browser tests with Playwright and writes results to Supabase.
// Executed by GitHub Actions (see .github/workflows/browser-tests.yml).
// Needs env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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

// Executes one step. Throws on failure.
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
      await page.getByText(step.value, { exact: false }).first().waitFor({ timeout });
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
  const { data: tests, error } = await supabase
    .from("browser_tests")
    .select("id, project_id, user_id, name, steps, projects(base_url)")
    .eq("enabled", true);

  if (error) {
    console.error("Load tests failed:", error.message);
    process.exit(1);
  }
  if (!tests || tests.length === 0) {
    console.log("No enabled tests.");
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
      console.log(
        `${ok ? "PASS" : "FAIL"}  ${t.name}  (${duration}ms)${errMsg ? " — " + errMsg : ""}`,
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
