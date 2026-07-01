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

const QUALITY_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/quality-audit`;

async function callFn(url: string, projectId: string) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Nie ste prihlásený.");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Zlyhalo (HTTP ${res.status})`);
  return data;
}

export async function runSecurityAudit(projectId: string): Promise<SecurityAudit> {
  const d = await callFn(URL, projectId);
  return { ...d, created_at: d.created_at ?? d.generatedAt } as SecurityAudit;
}

export async function runQualityAudit(projectId: string) {
  return await callFn(QUALITY_URL, projectId);
}

const GDPR_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gdpr-audit`;

export async function runGdprAudit(projectId: string): Promise<SecurityAudit> {
  const d = await callFn(GDPR_URL, projectId);
  return { ...d, created_at: d.created_at ?? d.generatedAt } as SecurityAudit;
}

const TRIGGER_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/trigger-tests`;

export async function triggerTests(): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Nie ste prihlásený.");
  const res = await fetch(TRIGGER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const data = await res.json();
  if (!res.ok || !data.ok)
    throw new Error(data?.error ?? `Spustenie zlyhalo (HTTP ${res.status})`);
}
