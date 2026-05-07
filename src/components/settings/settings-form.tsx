"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/patterns/chip";
import { cn } from "@/lib/utils";

export type CoachSettings = {
  display_name: string;
  business_name: string;
  bio: string;
  specialties: string[];
  is_accepting_clients: boolean;
};

export function SettingsForm({ initial }: { initial: CoachSettings }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [businessName, setBusinessName] = useState(initial.business_name);
  const [bio, setBio] = useState(initial.bio);
  const [specialties, setSpecialties] = useState<string[]>(initial.specialties);
  const [tagDraft, setTagDraft] = useState("");
  const [accepting, setAccepting] = useState(initial.is_accepting_clients);
  const [saving, setSaving] = useState(false);

  const dirty =
    displayName !== initial.display_name ||
    businessName !== initial.business_name ||
    bio !== initial.bio ||
    accepting !== initial.is_accepting_clients ||
    specialties.length !== initial.specialties.length ||
    specialties.some((s, i) => s !== initial.specialties[i]);

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    if (specialties.includes(t)) {
      setTagDraft("");
      return;
    }
    setSpecialties((prev) => [...prev, t]);
    setTagDraft("");
  };

  const removeTag = (t: string) => {
    setSpecialties((prev) => prev.filter((x) => x !== t));
  };

  const save = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("coaches")
      .update({
        display_name: displayName.trim(),
        business_name: businessName.trim() || null,
        bio: bio.trim() || null,
        specialties,
        is_accepting_clients: accepting,
      })
      .eq(
        "id",
        (await supabase.auth.getUser()).data.user?.id ?? ""
      );
    setSaving(false);
    if (error) {
      toast.error("Couldn't save", { description: error.message });
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Section title="Profile">
        <Field label="Display name" required>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Troy Garcia"
          />
        </Field>
        <Field
          label="Business name"
          hint="Optional. Shows in client-facing contexts later."
        >
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="ADPT Coaching"
          />
        </Field>
        <Field label="Bio" hint="A line or two about how you coach.">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="I help busy professionals build sustainable training habits…"
            className="min-h-[96px] resize-none"
          />
        </Field>
        <Field label="Specialties" hint="Press Enter to add a tag.">
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-input px-2 py-1.5">
            {specialties.map((t) => (
              <Chip key={t} className="gap-1.5 pr-1">
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="rounded p-0.5 transition-colors hover:bg-foreground/10"
                  aria-label={`Remove ${t}`}
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </Chip>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                } else if (
                  e.key === "Backspace" &&
                  !tagDraft &&
                  specialties.length > 0
                ) {
                  removeTag(specialties[specialties.length - 1]);
                }
              }}
              placeholder={specialties.length === 0 ? "Strength, Hypertrophy, …" : ""}
              className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </Field>
      </Section>

      <Section title="Roster">
        <ToggleField
          label="Accepting new clients"
          hint="When off, your invite links still work for existing flows but you'll appear as full to anyone browsing."
          checked={accepting}
          onChange={setAccepting}
        />
      </Section>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        {!dirty && (
          <span className="text-xs text-muted-foreground">No changes</span>
        )}
        <Button onClick={save} disabled={saving || !dirty || !displayName.trim()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-foreground" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
