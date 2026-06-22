"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";
import { AddProjectModal } from "./add-project-modal";
import { AlertSettings } from "./alert-settings";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setEmail(user.email ?? null);

    const { data } = await supabase
      .from("projects")
      .select("id, name, base_url, created_at")
      .order("created_at", { ascending: false });
    setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">
              QA
            </span>
            <span className="font-semibold">QA Agent</span>
          </div>
          <div className="flex items-center gap-4">
            {email && (
              <span className="hidden text-sm text-muted sm:block">{email}</span>
            )}
            <Button variant="ghost" onClick={signOut}>
              Odhlásiť
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projekty</h1>
            <p className="mt-1 text-sm text-muted">
              Weby, ktoré monitorujete a testujete.
            </p>
          </div>
          <AddProjectModal onAdded={load} />
        </div>

        <div className="mb-6">
          <AlertSettings />
        </div>

        {loading && <p className="text-sm text-muted">Načítavam…</p>}

        {!loading && projects && projects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
            <p className="text-foreground">Zatiaľ žiadne projekty.</p>
            <p className="mt-1 text-sm text-muted">
              Kliknite na „Pridať projekt" a začnite.
            </p>
          </div>
        )}

        {!loading && projects && projects.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/50"
              >
                <Link
                  href={`/project?id=${p.id}`}
                  className="font-medium hover:text-primary"
                >
                  {p.name}
                </Link>
                <a
                  href={p.base_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-sm text-primary hover:underline"
                >
                  {p.base_url}
                </a>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted">
                    Pridané{" "}
                    {new Date(p.created_at).toLocaleDateString("sk-SK", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <Link
                    href={`/project?id=${p.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Detail &amp; kontroly →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
