// Best-effort outage notifications. Each channel is optional and only fires
// when its env var is configured, so the app works with zero channels set up.
import type { CheckResult } from "@/lib/checks";

type AlertProject = { name: string; base_url: string };

export async function sendDownAlert(
  project: AlertProject,
  result: CheckResult,
): Promise<void> {
  const reason = result.error ?? `HTTP ${result.statusCode ?? "?"}`;
  const text = `🔴 QA Agent: web "${project.name}" (${project.base_url}) je nedostupný — ${reason}`;

  await Promise.allSettled([sendSlack(text), sendEmail(project, text)]);
}

async function sendSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

async function sendEmail(
  project: AlertProject,
  text: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  const from = process.env.ALERT_EMAIL_FROM;
  if (!apiKey || !to || !from) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `🔴 Výpadok: ${project.name}`,
      text,
    }),
  });
}
