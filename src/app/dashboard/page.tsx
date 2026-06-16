import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AddProjectModal } from "./add-project-modal";

type Project = {
  id: string;
  name: string;
  base_url: string;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, base_url, created_at")
    .order("created_at", { ascending: false });

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
            <span className="hidden text-sm text-muted sm:block">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" type="submit">
                Odhlásiť
              </Button>
            </form>
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
          <AddProjectModal />
        </div>

        {error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            Nepodarilo sa načítať projekty: {error.message}
          </p>
        )}

        {!error && (!projects || projects.length === 0) && (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
            <p className="text-foreground">Zatiaľ žiadne projekty.</p>
            <p className="mt-1 text-sm text-muted">
              Kliknite na „Pridať projekt" a začnite.
            </p>
          </div>
        )}

        {!error && projects && projects.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(projects as Project[]).map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/50"
              >
                <h3 className="font-medium">{p.name}</h3>
                <a
                  href={p.base_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-sm text-primary hover:underline"
                >
                  {p.base_url}
                </a>
                <p className="mt-4 text-xs text-muted">
                  Pridané{" "}
                  {new Date(p.created_at).toLocaleDateString("sk-SK", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
