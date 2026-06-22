import { createClient } from "@/lib/supabase/client";

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-checks`;

// Triggers a server-side check for one project via the Supabase edge function.
// The website fetch + AI report run on Supabase (no CORS / no secret in the
// browser); we just pass the logged-in user's access token.
export async function triggerCheck(projectId: string, ai = true): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Nie ste prihlásený.");

  const res = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId, ai }),
  });

  if (!res.ok) {
    throw new Error(`Kontrola zlyhala (HTTP ${res.status}).`);
  }
}
