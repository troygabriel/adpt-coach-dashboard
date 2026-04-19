"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pin,
  PinOff,
  Trash2,
  Edit3,
  Save,
  X,
  StickyNote,
  Utensils,
  Dumbbell,
  Heart,
  BookOpen,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";
import type { CoachNote } from "@/types";

interface CoachNotesPanelProps {
  notes: CoachNote[];
  clientId: string;
  coachId: string;
}

const CATEGORIES = [
  { value: "pinned", label: "Pinned", icon: Pin, color: "text-gold" },
  { value: "general", label: "General", icon: StickyNote, color: "text-foreground" },
  { value: "nutrition", label: "Nutrition", icon: Utensils, color: "text-success" },
  { value: "training", label: "Training", icon: Dumbbell, color: "text-primary" },
  { value: "lifestyle", label: "Lifestyle", icon: Heart, color: "text-accent" },
  { value: "weekly", label: "Weekly", icon: Calendar, color: "text-info" },
] as const;

type NoteCategory = (typeof CATEGORIES)[number]["value"];

export function CoachNotesPanel({
  notes,
  clientId,
  coachId,
}: CoachNotesPanelProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<NoteCategory>("general");
  const [saving, setSaving] = useState(false);

  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const otherNotes = notes.filter((n) => !n.is_pinned);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    const supabase = createClient();

    await supabase.from("coach_notes").insert({
      coach_id: coachId,
      client_id: clientId,
      category: newCategory,
      title: newTitle.trim(),
      content: newContent.trim(),
      is_pinned: newCategory === "pinned",
    });

    setNewTitle("");
    setNewContent("");
    setNewCategory("general");
    setDialogOpen(false);
    setSaving(false);
    router.refresh();
  };

  const handleTogglePin = async (note: CoachNote) => {
    const supabase = createClient();
    await supabase
      .from("coach_notes")
      .update({
        is_pinned: !note.is_pinned,
        category: !note.is_pinned ? "pinned" : "general",
      })
      .eq("id", note.id);
    router.refresh();
  };

  const handleDelete = async (noteId: string) => {
    const supabase = createClient();
    await supabase.from("coach_notes").delete().eq("id", noteId);
    router.refresh();
  };

  const handleStartEdit = (note: CoachNote) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const supabase = createClient();
    await supabase
      .from("coach_notes")
      .update({
        title: editTitle.trim(),
        content: editContent.trim(),
      })
      .eq("id", editingId);
    setEditingId(null);
    router.refresh();
  };

  const getCategoryConfig = (category: string) =>
    CATEGORIES.find((c) => c.value === category) || CATEGORIES[1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            All your client instructions, nutrition plans, and notes in one
            place. No more switching to Notion.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Note / Instruction</DialogTitle>
              <DialogDescription>
                Add coaching notes, nutrition instructions, training cues, or
                anything you&apos;d normally put in Notion or a separate doc.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Category selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter((c) => c.value !== "pinned").map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <Button
                        key={cat.value}
                        variant={
                          newCategory === cat.value ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setNewCategory(cat.value)}
                      >
                        <Icon className="mr-1.5 h-3.5 w-3.5" />
                        {cat.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Title
                </label>
                <Input
                  placeholder='e.g., "Macro Targets", "Squat Cues", "Weekly Plan"'
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Content
                </label>
                <textarea
                  className="w-full rounded-md border border-border bg-input p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[120px]"
                  placeholder="Write your instructions, notes, or guidance here..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={saving || !newTitle.trim() || !newContent.trim()}
              >
                {saving ? "Saving..." : "Save Note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pinned notes — always visible at top */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gold">
            <Pin className="h-3 w-3" />
            PINNED INSTRUCTIONS
          </div>
          {pinnedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isEditing={editingId === note.id}
              editTitle={editTitle}
              editContent={editContent}
              onEditTitle={setEditTitle}
              onEditContent={setEditContent}
              onStartEdit={() => handleStartEdit(note)}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingId(null)}
              onTogglePin={() => handleTogglePin(note)}
              onDelete={() => handleDelete(note.id)}
              getCategoryConfig={getCategoryConfig}
            />
          ))}
        </div>
      )}

      {/* Other notes */}
      {otherNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.length > 0 && <Separator />}
          {otherNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isEditing={editingId === note.id}
              editTitle={editTitle}
              editContent={editContent}
              onEditTitle={setEditTitle}
              onEditContent={setEditContent}
              onStartEdit={() => handleStartEdit(note)}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => setEditingId(null)}
              onTogglePin={() => handleTogglePin(note)}
              onDelete={() => handleDelete(note.id)}
              getCategoryConfig={getCategoryConfig}
            />
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">No notes yet</p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Add nutrition instructions, training cues, weekly plans, or any
              coaching notes. Everything in one place — no more Notion docs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NoteCard({
  note,
  isEditing,
  editTitle,
  editContent,
  onEditTitle,
  onEditContent,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onTogglePin,
  onDelete,
  getCategoryConfig,
}: {
  note: CoachNote;
  isEditing: boolean;
  editTitle: string;
  editContent: string;
  onEditTitle: (v: string) => void;
  onEditContent: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  getCategoryConfig: (category: string) => (typeof CATEGORIES)[number];
}) {
  const config = getCategoryConfig(note.category);
  const Icon = config.icon;

  if (isEditing) {
    return (
      <Card className="border-primary/30 bg-card">
        <CardContent className="p-4 space-y-3">
          <Input
            value={editTitle}
            onChange={(e) => onEditTitle(e.target.value)}
            className="font-medium"
          />
          <textarea
            className="w-full rounded-md border border-border bg-input p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            value={editContent}
            onChange={(e) => onEditContent(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancelEdit}>
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
            <Button size="sm" onClick={onSaveEdit}>
              <Save className="mr-1 h-3 w-3" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              <span className="font-medium text-foreground text-sm">
                {note.title}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {note.content}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Updated {formatRelativeDate(note.updated_at)}
            </p>
          </div>

          {/* Actions — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onTogglePin}
            >
              {note.is_pinned ? (
                <PinOff className="h-3.5 w-3.5 text-gold" />
              ) : (
                <Pin className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onStartEdit}
            >
              <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
