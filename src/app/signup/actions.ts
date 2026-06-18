"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signup(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is enabled there is no active session yet.
  if (!data.session) {
    return {
      success:
        "Účet vytvorený. Skontrolujte si email a potvrďte registráciu, potom sa prihláste.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
