// Performs a lightweight availability check against a website: fetches the
// page, measures response time, and returns the status. Runs server-side only.

export type CheckResult = {
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
  bodySnippet: string | null;
};

export async function runWebsiteCheck(baseUrl: string): Promise<CheckResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(baseUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "QA-Agent/1.0 (+monitoring)" },
      cache: "no-store",
    });
    const responseTimeMs = Date.now() - start;

    // Grab a small slice of the body for the optional AI analysis.
    let bodySnippet: string | null = null;
    try {
      const text = await res.text();
      bodySnippet = text.slice(0, 8000);
    } catch {
      bodySnippet = null;
    }

    return {
      ok: res.ok,
      statusCode: res.status,
      responseTimeMs,
      error: res.ok ? null : `HTTP ${res.status} ${res.statusText}`,
      bodySnippet,
    };
  } catch (err) {
    const responseTimeMs = Date.now() - start;
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      statusCode: null,
      responseTimeMs,
      error: isAbort
        ? "Časový limit (15 s) vypršal – web neodpovedal."
        : err instanceof Error
          ? err.message
          : "Neznáma chyba pri načítaní webu.",
      bodySnippet: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
