"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthFormProps = { mode: "login" | "signup" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = createClient();

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        router.replace("/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        if (!data.session) {
          setSuccess(
            "Účet vytvorený. Skontrolujte si email a potvrďte registráciu, potom sa prihláste.",
          );
          return;
        }
        router.replace("/dashboard");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isLogin ? "Prihlásenie" : "Vytvorenie účtu"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {isLogin
            ? "Prihláste sa do QA Agent."
            : "Začnite monitorovať svoje weby."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="vy@firma.sk"
          autoComplete="email"
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Heslo"
          placeholder="••••••••"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={6}
          required
        />

        {error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {success}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? "Moment…"
            : isLogin
              ? "Prihlásiť sa"
              : "Vytvoriť účet"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isLogin ? (
          <>
            Nemáte účet?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Registrácia
            </Link>
          </>
        ) : (
          <>
            Už máte účet?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Prihlásenie
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
