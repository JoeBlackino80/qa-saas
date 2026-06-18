"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { runCheck } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Kontrolujem…" : "Spustiť kontrolu"}
    </Button>
  );
}

export function RunCheckButton({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(runCheck, undefined);

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="project_id" value={projectId} />
      <SubmitButton />
      {state?.error && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}
