import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { performCheck } from "@/lib/run-check";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds (Vercel function limit)

type ProjectRow = {
  id: string;
  name: string;
  base_url: string;
  user_id: string;
};

// Runs an availability check for every project. Called on a schedule by Vercel
// Cron (see vercel.json). Protected by CRON_SECRET so it can't be triggered
// by anyone who finds the URL.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "config error" },
      { status: 500 },
    );
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, base_url, user_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (projects ?? []) as ProjectRow[];

  // Run all checks concurrently; each is independent.
  const results = await Promise.allSettled(
    rows.map((p) =>
      performCheck(supabase, { id: p.id, name: p.name, base_url: p.base_url }, p.user_id),
    ),
  );

  const checked = results.length;
  const failed = results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok),
  ).length;

  return NextResponse.json({ checked, down: failed });
}
