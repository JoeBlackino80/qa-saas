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
