import Anthropic from "@anthropic-ai/sdk";
import type { CheckResult } from "@/lib/checks";

// Model used for QA reports. Defaults to the most capable model; switch to
// "claude-sonnet-4-6" or "claude-haiku-4-5" to lower cost per check.
const MODEL = "claude-opus-4-8";

export function isAnthropicConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return Boolean(key && key !== "your-anthropic-api-key");
}

// Produces a short QA report for a website check using Claude. Returns null
// if the API key isn't configured, so the rest of the check still works.
export async function generateQaReport(
  baseUrl: string,
  result: CheckResult,
): Promise<string | null> {
  if (!isAnthropicConfigured()) return null;

  const client = new Anthropic();

  const status = result.ok
    ? `online (HTTP ${result.statusCode}, ${result.responseTimeMs} ms)`
    : `nedostupný (${result.error ?? "neznáma chyba"})`;

  const prompt = `Si QA analytik webov. Analyzuj výsledok kontroly webu ${baseUrl}.

Stav: ${status}
${result.bodySnippet ? `\nÚryvok HTML (prvých 8000 znakov):\n"""\n${result.bodySnippet}\n"""` : ""}

Napíš stručný report v slovenčine (max 6 odrážok) zameraný na: dostupnosť a rýchlosť, zjavné chyby alebo problémy, základné SEO/UX poznámky (title, meta description, jazyk) a 1–2 konkrétne odporúčania. Buď vecný, žiadny úvod ani záver.`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    messages: [{ role: "user", content: prompt }],
  });

  const message = await stream.finalMessage();
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return text || null;
}
