"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/toaster";
import {
  loadMyBranding,
  saveBranding,
  uploadLogo,
  type Branding,
} from "@/lib/branding-client";

const EMPTY: Branding = {
  agency_name: "",
  brand_color: "#4f46e5",
  logo_url: "",
  contact_email: "",
  website_url: "",
};

export function BrandingSettings() {
  const [open, setOpen] = useState(false);
  const [b, setB] = useState<Branding>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    loadMyBranding().then((data) => {
      if (data) setB({ ...EMPTY, ...data, brand_color: data.brand_color || "#4f46e5" });
      setLoaded(true);
    });
  }, [open, loaded]);

  async function onLogo(file: File) {
    setUploading(true);
    try {
      const url = await uploadLogo(file);
      setB((p) => ({ ...p, logo_url: url }));
      toast("Logo nahrané.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nahranie zlyhalo.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await saveBranding(b);
      toast("Branding uložený.", "success");
      setOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Uloženie zlyhalo.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted hover:text-foreground"
      >
        Branding
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-medium">Branding pre klientov</p>
        <button
          onClick={() => setOpen(false)}
          className="text-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Tvoje logo a farba sa zobrazia na klientskom reporte, status page,
        správe pre správcu aj v týždennom e-maile.
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-2">
            {b.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.logo_url}
                alt="logo"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted">logo</span>
            )}
          </div>
          <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-surface-2">
            {uploading ? "Nahrávam…" : "Nahrať logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onLogo(f);
              }}
            />
          </label>
        </div>

        <Input
          id="agency_name"
          name="agency_name"
          label="Názov agentúry / firmy"
          placeholder="Moja Agentúra s.r.o."
          value={b.agency_name ?? ""}
          onChange={(e) => setB({ ...b, agency_name: e.target.value })}
        />

        <div className="flex items-end gap-3">
          <div>
            <label
              htmlFor="brand_color"
              className="mb-1.5 block text-sm font-medium text-muted"
            >
              Farba značky
            </label>
            <input
              id="brand_color"
              type="color"
              value={b.brand_color || "#4f46e5"}
              onChange={(e) => setB({ ...b, brand_color: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface-2"
            />
          </div>
          <Input
            id="brand_color_hex"
            name="brand_color_hex"
            label="HEX"
            placeholder="#4f46e5"
            value={b.brand_color ?? ""}
            onChange={(e) => setB({ ...b, brand_color: e.target.value })}
            className="flex-1"
          />
        </div>

        <Input
          id="contact_email"
          name="contact_email"
          type="email"
          label="Kontaktný e-mail (na reportoch)"
          placeholder="info@agentura.sk"
          value={b.contact_email ?? ""}
          onChange={(e) => setB({ ...b, contact_email: e.target.value })}
        />
        <Input
          id="website_url"
          name="website_url"
          label="Web (na reportoch)"
          placeholder="https://agentura.sk"
          value={b.website_url ?? ""}
          onChange={(e) => setB({ ...b, website_url: e.target.value })}
        />

        <Button onClick={save} disabled={saving || uploading}>
          {saving ? "Ukladám…" : "Uložiť branding"}
        </Button>
      </div>
    </div>
  );
}
