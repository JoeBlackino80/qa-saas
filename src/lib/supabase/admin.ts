import { createClient } from "@supabase/supabase-js";

// Service-role client for trusted server-side jobs (e.g. cron). Bypasses RLS,
// so it must NEVER be imported into client components or exposed to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || serviceKey === "your-supabase-service-role-key") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY nie je nastavený — cron kontroly nemôžu bežať.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
