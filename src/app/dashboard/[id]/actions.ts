"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runWebsiteCheck } from "@/lib/checks";
import { generateQaReport } from "@/lib/anthropic";

export async function runCheck(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return { error: "Chýba ID projektu." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nie ste prihlásený." };

  // Fetch the project (RLS guarantees ownership).
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, base_url")
    .eq("id", projectId)
    .single();

  if (projErr || !project) return { error: "Projekt sa nenašiel." };

  // Run the availability check, then optionally the AI report.
  const result = await runWebsiteCheck(project.base_url);

  let aiReport: string | null = null;
  try {
    aiReport = await generateQaReport(project.base_url, result);
  } catch {
    aiReport = null; // AI report is best-effort; never block the check.
  }

  const { error: insErr } = await supabase.from("checks").insert({
    project_id: project.id,
    user_id: user.id,
    status_code: result.statusCode,
    ok: result.ok,
    response_time_ms: result.responseTimeMs,
    error: result.error,
    ai_report: aiReport,
  });

  if (insErr) return { error: insErr.message };

  revalidatePath(`/dashboard/${projectId}`);
  return undefined;
}
