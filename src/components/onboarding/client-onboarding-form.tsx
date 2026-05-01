"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const GOALS = [
  { value: "lose_fat", label: "Lose fat" },
  { value: "build_muscle", label: "Build muscle" },
  { value: "get_stronger", label: "Get stronger" },
  { value: "general_fitness", label: "General fitness" },
  { value: "sport_specific", label: "Sport-specific" },
];

const EXPERIENCE = [
  { value: "beginner", label: "Less than 1 year" },
  { value: "intermediate", label: "1–3 years" },
  { value: "advanced", label: "3+ years" },
];

const EQUIPMENT = [
  { value: "full_gym", label: "Full gym" },
  { value: "home_gym", label: "Home gym" },
  { value: "dumbbells_only", label: "Dumbbells only" },
  { value: "minimal", label: "Minimal / bodyweight" },
];

const DAYS = [2, 3, 4, 5, 6] as const;

interface Props {
  token: string;
  email: string;
  coachName: string;
}

export function ClientOnboardingForm({ token, email, coachName }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [dob, setDob] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [goal, setGoal] = useState("");
  const [experience, setExperience] = useState("");
  const [days, setDays] = useState<number | null>(null);
  const [equipment, setEquipment] = useState("");
  const [injuries, setInjuries] = useState("");
  const [diet, setDiet] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (!goal || !experience || !days || !equipment) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) {
      toast.error("Couldn't set password", { description: pwError.message });
      setSubmitting(false);
      return;
    }

    const { error: acceptError } = await supabase.rpc("accept_invitation", {
      invitation_token: token,
    });
    if (acceptError) {
      toast.error("Couldn't connect to coach", { description: acceptError.message });
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Session expired — please sign in again");
      setSubmitting(false);
      return;
    }

    const { error: intakeError } = await supabase.from("client_intakes").upsert({
      client_id: user.id,
      date_of_birth: dob || null,
      height_cm: heightCm ? parseInt(heightCm, 10) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      primary_goal: goal,
      experience_level: experience,
      training_days_per_week: days,
      equipment_access: equipment,
      injuries: injuries.trim() || null,
      dietary_notes: diet.trim() || null,
    });
    if (intakeError) {
      toast.error("Couldn't save intake", { description: intakeError.message });
      setSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome to ADPT</h1>
        <p className="text-sm text-muted-foreground">
          {coachName} has set up your coaching. A few quick details so they can build your program.
        </p>
      </header>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-medium">Set a password</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            You&apos;re signed in as <span className="font-mono">{email}</span>
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Confirm password</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
      </Card>

      <Card className="space-y-5 p-5">
        <h2 className="text-base font-medium">About you</h2>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Date of birth">
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
          <Field label="Height (cm)">
            <Input
              type="number"
              inputMode="numeric"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="175"
            />
          </Field>
          <Field label="Weight (kg)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="75"
            />
          </Field>
        </div>

        <Field label="Primary goal" required>
          <ChipGroup options={GOALS} value={goal} onChange={setGoal} />
        </Field>

        <Field label="Training experience" required>
          <ChipGroup options={EXPERIENCE} value={experience} onChange={setExperience} />
        </Field>

        <Field label="Training days per week" required>
          <div className="flex gap-2">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "h-10 w-12 rounded-md border text-sm transition-colors",
                  days === d
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted/50"
                )}
              >
                {d}
                {d === 6 ? "+" : ""}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Equipment access" required>
          <ChipGroup options={EQUIPMENT} value={equipment} onChange={setEquipment} />
        </Field>

        <Field label="Injuries or limitations">
          <Textarea
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder="Anything we should work around? (optional)"
            rows={2}
          />
        </Field>

        <Field label="Dietary notes">
          <Textarea
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
            placeholder="Allergies, preferences, anything else (optional)"
            rows={2}
          />
        </Field>
      </Card>

      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {submitting ? "Saving..." : "Complete setup"}
      </Button>
    </form>
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
        {required && <span className="ml-0.5 text-muted-foreground">*</span>}
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md border px-3 py-2 text-left text-sm transition-colors",
            value === opt.value
              ? "border-foreground bg-foreground text-background"
              : "border-border hover:bg-muted/50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
