"use client";

/**
 * Client onboarding form. Premium-feel single page that mirrors the mobile
 * app's editorial vibe (Cal AI / MacroFactor: light, hairline, big type,
 * generous spacing, monochrome). Shown when a client opens an invite link.
 *
 * Inputs are imperial (lbs/feet) to match the North American audience.
 * Conversion to metric (cm/kg) happens at the boundary so the database
 * stays consistent with the mobile app's source-of-truth schema.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const GOALS = [
  { value: "lose_fat", label: "Lose fat" },
  { value: "build_muscle", label: "Build muscle" },
  { value: "get_stronger", label: "Get stronger" },
  { value: "general_fitness", label: "Feel better, stay healthy" },
  { value: "sport_specific", label: "Sport-specific" },
];

const EXPERIENCE = [
  { value: "beginner", label: "New to lifting" },
  { value: "intermediate", label: "Some experience" },
  { value: "advanced", label: "3+ years lifting" },
];

const EQUIPMENT = [
  { value: "full_gym", label: "Full gym" },
  { value: "home_gym", label: "Home setup" },
  { value: "dumbbells_only", label: "Just dumbbells" },
  { value: "minimal", label: "Bodyweight only" },
];

const DAYS = [2, 3, 4, 5, 6] as const;

interface Props {
  token: string;
  email: string;
  coachName: string;
  /** Pre-filled from invitation row when the coach supplied a name. */
  invitedName?: string | null;
}

/** Convert ft/in inputs to cm. Returns null when inputs are missing/invalid. */
function feetInchesToCm(ft: string, inch: string): number | null {
  const f = ft ? parseInt(ft, 10) : 0;
  const i = inch ? parseInt(inch, 10) : 0;
  if (Number.isNaN(f) || Number.isNaN(i)) return null;
  if (f === 0 && i === 0) return null;
  return Math.round((f * 12 + i) * 2.54);
}

/** Convert lbs to kg with 0.1kg precision. Returns null when input invalid. */
function lbsToKg(lbs: string): number | null {
  if (!lbs) return null;
  const n = parseFloat(lbs);
  if (Number.isNaN(n)) return null;
  return Math.round((n / 2.20462) * 10) / 10;
}

export function ClientOnboardingForm({
  token,
  email,
  coachName,
  invitedName,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState(invitedName ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Imperial inputs — converted to metric at submit time.
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLbs, setWeightLbs] = useState("");

  const [goal, setGoal] = useState("");
  const [experience, setExperience] = useState("");
  const [days, setDays] = useState<number | null>(null);
  const [equipment, setEquipment] = useState("");
  const [injuries, setInjuries] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("What's your name?");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (!goal || !experience || !days || !equipment) {
      toast.error("Please fill in your goal, experience, days, and equipment");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/invite/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password,
        fullName: fullName.trim(),
        intake: {
          height_cm: feetInchesToCm(heightFt, heightIn),
          weight_kg: lbsToKg(weightLbs),
          primary_goal: goal,
          experience_level: experience,
          training_days_per_week: days,
          equipment_access: equipment,
          injuries: injuries.trim() || null,
        },
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Couldn't finish setup", {
        description: json.error ?? `HTTP ${res.status}`,
      });
      setSubmitting(false);
      return;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      console.warn("[onboarding] auto sign-in failed", signInErr.message);
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Editorial header — bigger type, more breathing room. */}
      <header className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Coaching with {coachName}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Let&apos;s build your program.
        </h1>
        <p className="text-base text-muted-foreground">
          A few quick answers so {coachName} can write a program that fits you,
          not someone&apos;s template. Takes about 90 seconds.
        </p>
      </header>

      {/* Section 1 — account */}
      <Section
        kicker="Step 1"
        title="Create your account"
        helper={
          <>
            We&apos;ll save it to{" "}
            <span className="font-mono text-foreground">{email}</span>.
          </>
        }
      >
        <Field label="Your name">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="First and last"
            required
            autoComplete="name"
            className="text-base"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              className="text-base"
            />
          </Field>
          <Field label="Confirm password">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="text-base"
            />
          </Field>
        </div>
      </Section>

      {/* Section 2 — body */}
      <Section
        kicker="Step 2"
        title="Your body today"
        helper="Used to scale weights and calorie targets. You can update this anytime."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Height">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                placeholder="5"
                className="text-base"
              />
              <span className="text-sm text-muted-foreground">ft</span>
              <Input
                type="number"
                inputMode="numeric"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                placeholder="10"
                className="text-base"
              />
              <span className="text-sm text-muted-foreground">in</span>
            </div>
          </Field>
          <Field label="Weight (lbs)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weightLbs}
              onChange={(e) => setWeightLbs(e.target.value)}
              placeholder="170"
              className="text-base"
            />
          </Field>
        </div>
      </Section>

      {/* Section 3 — training */}
      <Section
        kicker="Step 3"
        title="Your training"
        helper="So your program matches what you actually want from this."
      >
        <Field label="Primary goal" required>
          <ChipGroup options={GOALS} value={goal} onChange={setGoal} />
        </Field>

        <Field label="Experience" required>
          <ChipGroup
            options={EXPERIENCE}
            value={experience}
            onChange={setExperience}
          />
        </Field>

        <Field label="Days per week you can train" required>
          <div className="flex gap-2">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "h-12 w-14 rounded-lg border text-base font-medium transition-colors",
                  days === d
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted/40",
                )}
              >
                {d}
                {d === 6 ? "+" : ""}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Equipment" required>
          <ChipGroup
            options={EQUIPMENT}
            value={equipment}
            onChange={setEquipment}
          />
        </Field>

        <Field label="Anything to work around?">
          <Textarea
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder="Old injuries, surgeries, mobility limits — optional"
            rows={2}
            className="text-base"
          />
        </Field>
      </Section>

      <Button
        type="submit"
        disabled={submitting}
        size="lg"
        className="h-12 w-full text-base"
      >
        {submitting ? "Setting up…" : "Start training"}
      </Button>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        By continuing, you agree to share this info with {coachName}.
      </p>
    </form>
  );
}

function Section({
  kicker,
  title,
  helper,
  children,
}: {
  kicker: string;
  title: string;
  helper?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {kicker}
        </p>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {helper && (
          <p className="text-sm text-muted-foreground">{helper}</p>
        )}
      </header>
      <div className="space-y-5 border-t border-border pt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required && (
          <span className="ml-0.5 text-muted-foreground">*</span>
        )}
      </label>
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            value === opt.value
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background hover:bg-muted/40",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
