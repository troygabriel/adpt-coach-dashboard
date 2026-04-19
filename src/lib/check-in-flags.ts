import type { CheckInResponses, BodyStat, CheckInFlag } from "@/types";

/**
 * Auto-generates flags for a check-in based on responses and historical data.
 * Replaces the manual scanning coaches do across Notion/spreadsheets.
 */
export function generateFlags(
  responses: CheckInResponses | null,
  bodyStats: BodyStat[]
): CheckInFlag[] {
  const flags: CheckInFlag[] = [];

  if (!responses) return flags;

  // Weight stall: 3+ weeks within 0.5kg range
  if (bodyStats.length >= 3) {
    const recentWeights = bodyStats
      .filter((s) => s.weight_kg != null)
      .slice(-4)
      .map((s) => s.weight_kg!);

    if (recentWeights.length >= 3) {
      const min = Math.min(...recentWeights);
      const max = Math.max(...recentWeights);
      if (max - min < 0.5) {
        flags.push({
          type: "weight_stall",
          severity: "warning",
          message: "Weight stall detected",
          detail: `Weight within ${min.toFixed(1)}-${max.toFixed(1)}kg for ${recentWeights.length} weeks`,
        });
      }
    }

    // Weight spike: >2kg change in one week
    if (recentWeights.length >= 2) {
      const lastTwo = recentWeights.slice(-2);
      const delta = Math.abs(lastTwo[1] - lastTwo[0]);
      if (delta > 2) {
        flags.push({
          type: "weight_spike",
          severity: "warning",
          message: `Weight ${lastTwo[1] > lastTwo[0] ? "up" : "down"} ${delta.toFixed(1)}kg this week`,
          detail: `${lastTwo[0].toFixed(1)}kg -> ${lastTwo[1].toFixed(1)}kg`,
        });
      }
    }
  }

  // Low training adherence
  if (responses.training_adherence != null && responses.training_adherence <= 4) {
    flags.push({
      type: "low_adherence",
      severity: responses.training_adherence <= 2 ? "critical" : "warning",
      message: "Low training adherence",
      detail: `Rated ${responses.training_adherence}/10`,
    });
  }

  // Low nutrition adherence
  if (responses.nutrition_adherence != null && responses.nutrition_adherence <= 4) {
    flags.push({
      type: "low_adherence",
      severity: responses.nutrition_adherence <= 2 ? "critical" : "warning",
      message: "Low nutrition adherence",
      detail: `Rated ${responses.nutrition_adherence}/10`,
    });
  }

  // Low energy
  if (responses.energy_level != null && responses.energy_level <= 3) {
    flags.push({
      type: "low_energy",
      severity: responses.energy_level <= 2 ? "critical" : "warning",
      message: "Very low energy",
      detail: `Rated ${responses.energy_level}/10`,
    });
  }

  // Poor sleep
  if (responses.sleep_quality != null && responses.sleep_quality <= 3) {
    flags.push({
      type: "poor_sleep",
      severity: "warning",
      message: "Poor sleep quality",
      detail: `Rated ${responses.sleep_quality}/10${
        responses.sleep_hours ? `, ${responses.sleep_hours}hrs` : ""
      }`,
    });
  }

  // High stress
  if (responses.stress_level != null && responses.stress_level >= 8) {
    flags.push({
      type: "high_stress",
      severity: responses.stress_level >= 9 ? "critical" : "warning",
      message: "High stress reported",
      detail: `Rated ${responses.stress_level}/10`,
    });
  }

  // Pain/injury reported
  if (responses.injuries_or_pain && responses.injuries_or_pain.trim().length > 0) {
    flags.push({
      type: "pain_reported",
      severity: "critical",
      message: "Pain or injury reported",
      detail: responses.injuries_or_pain.slice(0, 100),
    });
  }

  return flags;
}
