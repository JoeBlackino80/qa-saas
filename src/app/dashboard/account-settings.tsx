"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/toaster";

const DELETE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`;

export function AccountSettings() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  async function changePassword() {
    if (pwd.length < 6) {
      toast("Heslo musí mať aspoň 6 znakov.", "error");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) toast(error.message, "error");
      else {
        toast("Heslo zmenené.", "success");
        setPwd("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(DELETE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast(data?.error ?? "Zmazanie zlyhalo.", "error");
        return;
      }
      await supabase.auth.signOut();
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted hover:text-foreground"
      >
        Účet
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">Účet</p>
        <button
          onClick={() => setOpen(false)}
          className="text-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <p className="mb-1 text-sm font-medium text-muted">Zmena hesla</p>
      <div className="flex gap-2">
        <Input
          id="newpwd"
          type="password"
          placeholder="Nové heslo (min. 6 znakov)"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          className="flex-1"
        />
        <Button onClick={changePassword} disabled={busy || !pwd}>
          Zmeniť
        </Button>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-1 text-sm font-medium text-danger">Zmazať účet</p>
        <p className="mb-3 text-xs text-muted">
          Natrvalo odstráni tvoj účet a všetky projekty, kontroly a audity.
          Nedá sa vrátiť.
        </p>
        {!confirmDel ? (
          <Button variant="danger" onClick={() => setConfirmDel(true)}>
            Zmazať účet
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmDel(false)}
              disabled={busy}
            >
              Zrušiť
            </Button>
            <Button variant="danger" onClick={deleteAccount} disabled={busy}>
              {busy ? "Mažem…" : "Naozaj zmazať účet"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
