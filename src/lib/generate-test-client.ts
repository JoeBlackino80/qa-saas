import { createClient } from "@/lib/supabase/client";

const URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-test`;

type Step = { type: string; selector?: string; value?: string };

export async function generateTest(
  projectId: string,
  description: string,
): Promise<{ name: string; steps: Step[] }> {
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
    body: JSON.stringify({ projectId, description }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Chyba (HTTP ${res.status})`);
  return { name: data.name ?? "", steps: data.steps ?? [] };
}
