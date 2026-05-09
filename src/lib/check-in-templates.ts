// Shape of a single question inside a check-in template. Stored as a JSONB
// array on `check_in_templates.questions`. The mobile client renders one
// of these per screen; the dashboard authors them via the template editor.

export type CheckInQuestionType =
  | "scale_1_10"
  | "text"
  | "single_select"
  | "multi_select"
  | "number"
  | "photo";

export type CheckInQuestion = {
  id: string;
  label: string;
  type: CheckInQuestionType;
  required: boolean;
  // Only meaningful for single_select / multi_select.
  options?: string[];
  // Optional one-line clarification shown under the question on mobile.
  helper?: string;
};

export const QUESTION_TYPE_LABELS: Record<CheckInQuestionType, string> = {
  scale_1_10: "Scale 1–10",
  text: "Free text",
  single_select: "Single choice",
  multi_select: "Multiple choice",
  number: "Number",
  photo: "Photo",
};

export const TEMPLATE_FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
export type TemplateFrequency = (typeof TEMPLATE_FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<TemplateFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

export function newQuestionId(): string {
  // Stable enough for client-side use; the row's primary key is the
  // template row, not the question.
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultQuestion(): CheckInQuestion {
  return {
    id: newQuestionId(),
    label: "",
    type: "scale_1_10",
    required: true,
  };
}

// A safe parser for the JSONB column. Rejects anything that doesn't smell
// like our shape so a hand-edited DB row can't crash the editor.
export function parseQuestions(raw: unknown): CheckInQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((q): CheckInQuestion[] => {
    if (!q || typeof q !== "object") return [];
    const r = q as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.label !== "string") return [];
    if (typeof r.type !== "string") return [];
    const type = r.type as CheckInQuestionType;
    if (!(type in QUESTION_TYPE_LABELS)) return [];
    return [
      {
        id: r.id,
        label: r.label,
        type,
        required: r.required === true,
        options: Array.isArray(r.options)
          ? r.options.filter((o): o is string => typeof o === "string")
          : undefined,
        helper: typeof r.helper === "string" ? r.helper : undefined,
      },
    ];
  });
}
