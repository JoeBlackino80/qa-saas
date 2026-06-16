"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addProject } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Ukladám…" : "Uložiť"}
    </Button>
  );
}

export function AddProjectModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(addProject, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  // Close the modal once a submit completes without an error.
  useEffect(() => {
    if (state === undefined && wasPending.current) {
      setOpen(false);
      formRef.current?.reset();
      wasPending.current = false;
    }
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Pridať projekt</Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nový projekt</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-foreground"
                aria-label="Zavrieť"
              >
                ✕
              </button>
            </div>

            <form
              ref={formRef}
              action={(fd) => {
                wasPending.current = true;
                formAction(fd);
              }}
              className="flex flex-col gap-4"
            >
              <Input
                id="name"
                name="name"
                label="Názov"
                placeholder="Môj web"
                required
              />
              <Input
                id="base_url"
                name="base_url"
                type="url"
                label="Base URL"
                placeholder="https://example.com"
                required
              />

              {state?.error && (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {state.error}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Zrušiť
                </Button>
                <SaveButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
