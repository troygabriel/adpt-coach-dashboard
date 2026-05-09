"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  defaultQuestion,
  FREQUENCY_LABELS,
  newQuestionId,
  QUESTION_TYPE_LABELS,
  TEMPLATE_FREQUENCIES,
  type CheckInQuestion,
  type CheckInQuestionType,
  type TemplateFrequency,
} from "@/lib/check-in-templates";

interface InitialState {
  name: string;
  frequency: TemplateFrequency;
  is_default: boolean;
  questions: CheckInQuestion[];
}

interface Props {
  templateId: string;
  initial: InitialState;
}

const SELECT_TYPES: CheckInQuestionType[] = ["single_select", "multi_select"];

export function TemplateEditor({ templateId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [frequency, setFrequency] = useState<TemplateFrequency>(initial.frequency);
  const [isDefault, setIsDefault] = useState(initial.is_default);
  const [questions, setQuestions] = useState<CheckInQuestion[]>(initial.questions);
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== initial.name ||
    frequency !== initial.frequency ||
    isDefault !== initial.is_default ||
    JSON.stringify(questions) !== JSON.stringify(initial.questions);

  function updateQuestion(id: string, patch: Partial<CheckInQuestion>) {
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, defaultQuestion()]);
  }

  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }

  function moveQuestion(id: string, direction: -1 | 1) {
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.id === id);
      if (idx === -1) return qs;
      const target = idx + direction;
      if (target < 0 || target >= qs.length) return qs;
      const next = qs.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function duplicateQuestion(id: string) {
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.id === id);
      if (idx === -1) return qs;
      const copy: CheckInQuestion = {
        ...qs[idx],
        id: newQuestionId(),
        options: qs[idx].options ? [...qs[idx].options!] : undefined,
      };
      return [...qs.slice(0, idx + 1), copy, ...qs.slice(idx + 1)];
    });
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Template needs a name");
      return;
    }
    if (questions.some((q) => !q.label.trim())) {
      toast.error("Every question needs a label");
      return;
    }
    if (
      questions.some(
        (q) =>
          SELECT_TYPES.includes(q.type) &&
          (!q.options || q.options.filter((o) => o.trim()).length < 2)
      )
    ) {
      toast.error("Choice questions need at least 2 options");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      toast.error("Not signed in");
      return;
    }

    // Default is single-row: clear others if we're flipping this one to true.
    if (isDefault && !initial.is_default) {
      await supabase
        .from("check_in_templates")
        .update({ is_default: false })
        .eq("coach_id", user.id);
    }

    const { error } = await supabase
      .from("check_in_templates")
      .update({
        name: trimmed,
        frequency,
        is_default: isDefault,
        questions,
      })
      .eq("id", templateId);

    setSaving(false);
    if (error) {
      toast.error("Couldn't save", { description: error.message });
      return;
    }
    toast.success("Template saved");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top metadata */}
      <Card className="space-y-4 p-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" htmlFor="template-name">
            Name
          </label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Weekly check-in"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Frequency</label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as TemplateFrequency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Default for new clients</label>
            <button
              type="button"
              role="switch"
              aria-checked={isDefault}
              onClick={() => setIsDefault((v) => !v)}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-border bg-input px-3 text-sm transition-colors",
                isDefault && "bg-foreground/5"
              )}
            >
              <span>{isDefault ? "Yes — assigned to new clients" : "No"}</span>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  isDefault ? "bg-foreground" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
                    isDefault ? "translate-x-[18px]" : "translate-x-0.5"
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Questions list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Questions</h2>
          <Button size="sm" variant="outline" onClick={addQuestion}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add question
          </Button>
        </div>

        {questions.length === 0 ? (
          <Card className="space-y-2 p-8 text-center">
            <p className="text-sm font-medium">No questions yet</p>
            <p className="text-xs text-muted-foreground">
              Add a question to start. Common starts: weight (number), energy
              (1–10 scale), what went well (free text).
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <QuestionRow
                key={q.id}
                question={q}
                index={idx}
                isFirst={idx === 0}
                isLast={idx === questions.length - 1}
                onChange={(patch) => updateQuestion(q.id, patch)}
                onMoveUp={() => moveQuestion(q.id, -1)}
                onMoveDown={() => moveQuestion(q.id, 1)}
                onDuplicate={() => duplicateQuestion(q.id)}
                onRemove={() => removeQuestion(q.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save bar — sticky bottom so coaches with long templates always see it */}
      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-lg border border-border bg-background/95 px-4 py-3 backdrop-blur">
        {!dirty && (
          <span className="text-xs text-muted-foreground">No changes</span>
        )}
        <Button
          onClick={save}
          disabled={saving || !dirty || !name.trim()}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function QuestionRow({
  question,
  index,
  isFirst,
  isLast,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  question: CheckInQuestion;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<CheckInQuestion>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const isSelect =
    question.type === "single_select" || question.type === "multi_select";

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-0.5 pt-1.5 text-muted-foreground">
          <GripVertical aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="text-[10px] font-mono">{index + 1}</span>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={question.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Question text"
            aria-label={`Question ${index + 1} label`}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select
              value={question.type}
              onValueChange={(v) => {
                const next = v as CheckInQuestionType;
                onChange({
                  type: next,
                  options:
                    next === "single_select" || next === "multi_select"
                      ? question.options ?? ["Option 1", "Option 2"]
                      : undefined,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(QUESTION_TYPE_LABELS) as CheckInQuestionType[]).map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <button
              type="button"
              role="switch"
              aria-checked={question.required}
              onClick={() => onChange({ required: !question.required })}
              className={cn(
                "flex h-9 items-center justify-between rounded-md border border-border bg-input px-3 text-sm transition-colors",
                question.required && "bg-foreground/5"
              )}
            >
              <span>{question.required ? "Required" : "Optional"}</span>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  question.required ? "bg-foreground" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
                    question.required ? "translate-x-[18px]" : "translate-x-0.5"
                  )}
                />
              </span>
            </button>
          </div>

          <Input
            value={question.helper ?? ""}
            onChange={(e) => onChange({ helper: e.target.value || undefined })}
            placeholder="Helper text (optional, e.g. “Be honest — this is private”)"
            className="text-xs"
          />

          {isSelect && (
            <OptionsEditor
              options={question.options ?? []}
              onChange={(opts) => onChange({ options: opts })}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move up"
          >
            <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move down"
          >
            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onDuplicate}
            aria-label="Duplicate"
            title="Duplicate"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove question"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Options</p>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={opt}
              onChange={(e) => {
                const next = options.slice();
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={`Option ${i + 1}`}
              className="text-sm"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              disabled={options.length <= 1}
              aria-label={`Remove option ${i + 1}`}
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onChange([...options, ""])}
        className="h-7 px-2 text-xs"
      >
        <Plus className="mr-1 h-3 w-3" />
        Add option
      </Button>
    </div>
  );
}
