"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthState = { error?: string; success?: string } | undefined;

type AuthAction = (
  prevState: AuthState,
  formData: FormData,
) => Promise<AuthState>;

type AuthFormProps = {
  mode: "login" | "signup";
  action: AuthAction;
  redirectTo?: string;
};

function SubmitButton({ mode }: { mode: "login" | "signup" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending
        ? "Moment…"
        : mode === "login"
          ? "Prihlásiť sa"
          : "Vytvoriť účet"}
    </Button>
  );
}

export function AuthForm({ mode, action, redirectTo }: AuthFormProps) {
  const [state, formAction] = useActionState(action, undefined);

  const isLogin = mode === "login";

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

      <form action={formAction} className="flex flex-col gap-4">
        {redirectTo && (
          <input type="hidden" name="redirect" value={redirectTo} />
        )}
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

        {state?.error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        {state?.success && (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {state.success}
          </p>
        )}

        <SubmitButton mode={mode} />
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
