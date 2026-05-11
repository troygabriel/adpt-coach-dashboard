import { Card } from "@/components/ui/card";

export type Intake = {
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  primary_goal: string | null;
  experience_level: string | null;
  training_days_per_week: number | null;
  equipment_access: string | null;
  injuries: string | null;
  dietary_notes: string | null;
  completed_at: string;
};

const GOAL_LABELS: Record<string, string> = {
  lose_fat: "Lose fat",
  build_muscle: "Build muscle",
  get_stronger: "Get stronger",
  general_fitness: "General fitness",
  sport_specific: "Sport-specific",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "<1 year",
  intermediate: "1–3 years",
  advanced: "3+ years",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  full_gym: "Full gym",
  home_gym: "Home gym",
  dumbbells_only: "Dumbbells only",
  minimal: "Minimal / bodyweight",
};

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** DB stores cm — display as `5'10"` for the NA audience. */
function formatHeight(cm: number | null): string {
  if (!cm) return "—";
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  // 11.5" rounds to 12" → bump to next foot
  if (inches === 12) return `${feet + 1}'0"`;
  return `${feet}'${inches}"`;
}

/** DB stores kg — display as `170 lbs`. */
function formatWeight(kg: number | null): string {
  if (!kg) return "—";
  return `${Math.round(kg * 2.20462)} lbs`;
}

export function IntakeCard({ intake }: { intake: Intake | null }) {
  if (!intake) {
    return (
      <Card className="p-5">
        <h2 className="text-base font-medium">Intake</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Client hasn&apos;t completed onboarding yet.
        </p>
      </Card>
    );
  }

  const age = calculateAge(intake.date_of_birth);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Intake</h2>
        <span className="text-xs text-muted-foreground">
          Completed {new Date(intake.completed_at).toLocaleDateString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Stat label="Age" value={age ? `${age}` : "—"} />
        <Stat label="Height" value={formatHeight(intake.height_cm)} />
        <Stat label="Weight" value={formatWeight(intake.weight_kg)} />
        <Stat label="Days/wk" value={intake.training_days_per_week?.toString() ?? "—"} />
        <Stat label="Goal" value={intake.primary_goal ? GOAL_LABELS[intake.primary_goal] : "—"} />
        <Stat
          label="Experience"
          value={intake.experience_level ? EXPERIENCE_LABELS[intake.experience_level] : "—"}
        />
        <Stat
          label="Equipment"
          value={intake.equipment_access ? EQUIPMENT_LABELS[intake.equipment_access] : "—"}
          className="col-span-2"
        />
      </div>

      {intake.injuries && (
        <Block label="Injuries / limitations" body={intake.injuries} />
      )}
      {intake.dietary_notes && (
        <Block label="Dietary notes" body={intake.dietary_notes} />
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="space-y-1 border-t pt-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-sm">{body}</p>
    </div>
  );
}
