/**
 * Phase goal vocabulary. Keep small + opinionated — these become the default
 * label for every phase, so they need to read well next to "Phase {n}: ".
 */
export const PHASE_GOALS = [
  { value: "hypertrophy", label: "Hypertrophy" },
  { value: "strength", label: "Strength" },
  { value: "cut", label: "Cut" },
  { value: "deload", label: "Deload" },
  { value: "test_week", label: "Test Week" },
  { value: "general", label: "General" },
] as const;

export type PhaseGoal = (typeof PHASE_GOALS)[number]["value"];

export function prettyGoal(goal: string | null | undefined): string | null {
  if (!goal) return null;
  const found = PHASE_GOALS.find((g) => g.value === goal);
  if (found) return found.label;
  // Custom goals get title-cased
  return goal
    .split(/[\s_-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

/**
 * Renders a phase as "Phase {n}: {goal}" when the user hasn't customized the
 * name. If they typed a custom name, that wins.
 */
export function phaseDisplayName(phase: {
  name: string | null;
  phase_number: number;
  goal: string | null;
}): string {
  const defaultName = `Phase ${phase.phase_number}`;
  const hasCustomName =
    !!phase.name && phase.name.trim() !== "" && phase.name !== defaultName;
  if (hasCustomName) return phase.name as string;
  const goalLabel = prettyGoal(phase.goal);
  return goalLabel ? `${defaultName}: ${goalLabel}` : defaultName;
}
