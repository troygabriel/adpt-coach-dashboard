"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RowActions, type RowAction } from "@/components/patterns/row-actions";

type Note = {
  id: string;
  body: string;
  createdAt: string;
};

export function NotesList({
  coachId,
  clientId,
  notes,
}: {
  coachId: string;
  clientId: string;
  notes: Note[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const addNote = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("coach_notes").insert({
      coach_id: coachId,
      client_id: clientId,
      body: draft.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save note", { description: error.message });
      return;
    }
    setDraft("");
    router.refresh();
  };

  const deleteNote = async (note: Note) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("coach_notes")
      .delete()
      .eq("id", note.id);
    if (error) {
      toast.error("Couldn't delete note", { description: error.message });
      return;
    }
    toast.success("Note deleted");
    router.refresh();
  };

  const noteActions = (note: Note): RowAction[] => [
    {
      id: "delete",
      label: "Delete note",
      icon: Trash2,
      destructive: true,
      onSelect: () => deleteNote(note),
      confirm: {
        title: "Delete note?",
        description: "This permanently removes the note. Can't be undone.",
        actionLabel: "Delete note",
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note about this client…"
          className="min-h-[72px] resize-none"
        />
        <Button
          onClick={addNote}
          disabled={saving || !draft.trim()}
          size="sm"
          className="self-end"
        >
          {saving ? "Adding…" : "Add"}
        </Button>
      </div>

      {/* List */}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {notes.map((note) => (
            <li key={note.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(note.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <RowActions
                actions={noteActions(note)}
                ariaLabel="Note options"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
