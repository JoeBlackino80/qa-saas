import { createClient } from "@/lib/supabase/client";

const REPORT_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/weekly-report`;

export type WeeklyReport = {
  project: { name: string; base_url: string };
  days: number;
  stats: {
    kontrol: number;
    uptimePercent: number | null;
    priemernaOdozvaMs: number | null;
    najpomalsiaMs: number | null;
    najrychlejsiaMs: number | null;
    vypadky: number;
    aktualnyStav: string;
    pocetZmienObsahu: number;
  };
  narrative: string | null;
  generatedAt: string;
};

export async function fetchReport(
  projectId: string,
  days: number,
): Promise<WeeklyReport> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Nie ste prihlásený.");

  const res = await fetch(REPORT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId, days }),
  });
  if (!res.ok) throw new Error(`Report sa nepodaril (HTTP ${res.status}).`);
  return (await res.json()) as WeeklyReport;
}
