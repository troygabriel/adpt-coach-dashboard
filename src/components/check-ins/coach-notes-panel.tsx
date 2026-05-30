"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Edit3, Save, X, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";
import type { CoachNote } from "@/types";

interface CoachNotesPanelProps {
  notes: CoachNote[];
  clientId: string;
  coachId: string;
}

// Body-only notes — mirrors the live `coach_notes` table. Categorized/pinned
// notes were a phantom feature (columns never existed) and have been removed;
// see CoachNote in src/types. Restoring them requires a DB migration first.
export function CoachNotesPanel({
  notes,
  clientId,
  coachId,
}: CoachNotesPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const handleCreate = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("coach_notes").insert({
      coach_id: coachId,
      client_id: clientId,
      body: draft.trim(),
    });
    setSaving(false);
    if (error) return;
    setDraft("");
    router.refresh();
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editBody.trim()) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("coach_notes")
      .update({ body: editBody.trim() })
      .eq("id", editingId);
    if (error) return;
    setEditingId(null);
    router.refresh();
  };

  const handleDelete = async (noteId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("coach_notes").delete().eq("id", noteId);
    if (error) return;
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        All your client instructions, nutrition guidance, and notes in one
        place. No more switching to Notion.
      </p>

      {/* Composer */}
      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note or instruction for this client…"
          className="min-h-[80px] resize-y"
        />
        <Button
          onClick={handleCreate}
          disabled={saving || !draft.trim()}
          size="sm"
          className="self-end"
        >
          {saving ? "Adding…" : "Add"}
        </Button>
      </div>

      {/* List */}
      {notes.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">No notes yet</p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Add nutrition instructions, training cues, weekly plans, or any
              coaching notes. Everything in one place.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((note) =>
            editingId === note.id ? (
              <Card key={note.id} className="border-primary/30 bg-card">
                <CardContent className="p-4 space-y-3">
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="min-h-[96px] resize-y"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={!editBody.trim()}>
                      <Save className="mr-1 h-3 w-3" />
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card key={note.id} className="border-border bg-card group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {note.body}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatRelativeDate(note.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditBody(note.body);
                        }}
                        aria-label="Edit note"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:text-destructive"
                        onClick={() => handleDelete(note.id)}
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
