import { createClient } from "@/lib/supabase/client";

const URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/assistant`;

async function call(payload: Record<string, unknown>): Promise<string> {
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
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Zlyhalo (HTTP ${res.status})`);
  return data.answer as string;
}

export async function askAssistant(
  projectId: string,
  question: string,
): Promise<string> {
  return call({ mode: "ask", projectId, question });
}

export async function actionPlan(): Promise<string> {
  return call({ mode: "plan" });
}
