import { createClient } from "@/lib/supabase/client";

export type Branding = {
  agency_name: string | null;
  brand_color: string | null;
  logo_url: string | null;
  contact_email: string | null;
  website_url: string | null;
};

const COLS =
  "agency_name, brand_color, logo_url, contact_email, website_url";

export async function loadBranding(userId: string): Promise<Branding | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("branding")
    .select(COLS)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Branding) ?? null;
}

export async function loadMyBranding(): Promise<Branding | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return loadBranding(user.id);
}

export async function saveBranding(b: Branding): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nie ste prihlásený.");
  const { error } = await supabase
    .from("branding")
    .upsert({ user_id: user.id, ...b, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function uploadLogo(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nie ste prihlásený.");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${user.id}/logo.${ext}`;
  const { error } = await supabase.storage
    .from("branding")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("branding").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
