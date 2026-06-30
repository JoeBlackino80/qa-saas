export type ContentChange = {
  severity: "critical" | "warning" | "info";
  message: string;
};

export type Project = {
  id: string;
  name: string;
  base_url: string;
  created_at: string;
  public_status?: boolean;
  auto_monitor?: boolean;
  ssl_expires_at?: string | null;
  domain_expires_at?: string | null;
  expiry_checked_at?: string | null;
  client_email?: string | null;
  weekly_report_enabled?: boolean;
};

export type QualityAudit = {
  performance: number | null;
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
  broken_count: number | null;
  broken_links: { url: string; status: number }[] | null;
  blacklisted: boolean | null;
  blacklist_detail: string | null;
  created_at: string;
};

export type Check = {
  id: string;
  status_code: number | null;
  ok: boolean;
  response_time_ms: number | null;
  error: string | null;
  ai_report: string | null;
  changes: ContentChange[] | null;
  created_at: string;
};
