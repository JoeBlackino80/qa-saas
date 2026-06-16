import { AuthForm } from "@/components/auth-form";
import { signup } from "./actions";

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <AuthForm mode="signup" action={signup} />
    </main>
  );
}
