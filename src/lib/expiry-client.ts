import { createClient } from "@/lib/supabase/client";

const URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/expiry-check`;

export type ExpiryResult = {
  ssl_expires_at: string | null;
  domain_expires_at: string | null;
  expiry_checked_at: string;
  ssl_days: number | null;
  domain_days: number | null;
};

export async function checkExpiry(projectId: string): Promise<ExpiryResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Nie ste prihlásený.");
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Zlyhalo (HTTP ${res.status})`);
  return data as ExpiryResult;
}
