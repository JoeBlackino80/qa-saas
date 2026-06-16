"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addProject(
  _prevState: { error: string } | undefined,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const baseUrl = String(formData.get("base_url") ?? "").trim();

  if (!name || !baseUrl) {
    return { error: "Vyplňte názov aj URL." };
  }

  try {
    new URL(baseUrl);
  } catch {
    return { error: "Zadajte platnú URL (vrátane https://)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nie ste prihlásený." };
  }

  const { error } = await supabase
    .from("projects")
    .insert({ name, base_url: baseUrl, user_id: user.id });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return undefined;
}
