import { createClient } from "@/lib/supabase/client";

const URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/security-audit`;

export type SecurityFinding = {
  title: string;
  severity: "high" | "medium" | "low" | "ok";
  detail: string;
};
export type SecurityAudit = {
  grade: string;
  score: number;
  findings: SecurityFinding[];
  ai_summary: string | null;
  created_at?: string;
};

export async function runSecurityAudit(projectId: string): Promise<SecurityAudit> {
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
  if (!res.ok) throw new Error(data?.error ?? `Audit zlyhal (HTTP ${res.status})`);
  return data as SecurityAudit;
}
