import type { SupabaseClient } from "@supabase/supabase-js";
import { runWebsiteCheck, type CheckResult } from "@/lib/checks";
import { generateQaReport } from "@/lib/anthropic";
import { sendDownAlert } from "@/lib/alerts";

type CheckableProject = {
  id: string;
  name: string;
  base_url: string;
};

// Shared check pipeline used by both the manual button and the cron job:
// fetch the site, generate an optional AI report, store the result, and fire
// an outage alert when the site is down. AI report and alerts are best-effort.
export async function performCheck(
  supabase: SupabaseClient,
  project: CheckableProject,
  userId: string,
): Promise<CheckResult> {
  const result = await runWebsiteCheck(project.base_url);

  let aiReport: string | null = null;
  try {
    aiReport = await generateQaReport(project.base_url, result);
  } catch {
    aiReport = null;
  }

  await supabase.from("checks").insert({
    project_id: project.id,
    user_id: userId,
    status_code: result.statusCode,
    ok: result.ok,
    response_time_ms: result.responseTimeMs,
    error: result.error,
    ai_report: aiReport,
  });

  if (!result.ok) {
    try {
      await sendDownAlert(project, result);
    } catch {
      // never let a failing alert channel break the check
    }
  }

  return result;
}
