import { AuthForm } from "@/components/auth-form";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <AuthForm mode="login" action={login} redirectTo={redirect} />
    </main>
  );
}
