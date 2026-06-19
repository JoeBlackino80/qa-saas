"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { performCheck } from "@/lib/run-check";

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
    .select("id, name, base_url")
    .eq("id", projectId)
    .single();

  if (projErr || !project) return { error: "Projekt sa nenašiel." };

  try {
    await performCheck(supabase, project, user.id);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Kontrola zlyhala.",
    };
  }

  revalidatePath(`/dashboard/${projectId}`);
  return undefined;
}
