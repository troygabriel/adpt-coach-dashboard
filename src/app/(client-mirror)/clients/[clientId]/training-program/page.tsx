import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProgramSummary } from "@/components/clients/program-summary";

export const dynamic = "force-dynamic";

export default async function ClientTrainingProgramPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: program } = await supabase
    .from("coaching_programs")
    .select(
      `
      id, name, description, status, start_date, end_date,
      program_phases (
        id, name, description, phase_number, duration_weeks, goal, status,
        phase_workouts (id, day_number, name, exercises)
      )
    `
    )
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Training program
          </h1>
          <p className="text-sm text-muted-foreground">
            {program
              ? "What this client is training. Read-only here — open the builder to edit."
              : "No active program assigned yet."}
          </p>
        </div>
        {program ? (
          <Link href={`/programs/${program.id}`}>
            <Button variant="outline" size="sm">
              <ArrowUpRight aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Open in builder
            </Button>
          </Link>
        ) : (
          <Link href="/programs">
            <Button size="sm">
              <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Create program
            </Button>
          </Link>
        )}
      </div>

      {program ? (
        <ProgramSummary
          programId={program.id}
          programName={program.name}
          phases={(program.program_phases ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            phaseNumber: p.phase_number,
            durationWeeks: p.duration_weeks,
            goal: p.goal,
            status: p.status,
            workouts: (p.phase_workouts ?? []).map((w) => ({
              id: w.id,
              dayNumber: w.day_number,
              name: w.name,
              exercises: (w.exercises ?? []) as { name: string; sets: number; reps: string }[],
            })),
          }))}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-medium">No active program</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Programs you build for this client will show up here once they&rsquo;re activated.
          </p>
        </div>
      )}
    </div>
  );
}
