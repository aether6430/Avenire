"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { Textarea } from "@avenire/ui/components/textarea";
import { Pause, Pencil, Plus, Trash as Trash2 } from "@phosphor-icons/react";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react/BookOpenText";
import type { FlashcardCardRecord } from "@/lib/flashcards";

export function FlashcardSetDetailActions({
  backMarkdown,
  busy,
  concept,
  description,
  editingCard,
  editorOpen,
  enrollmentStatus,
  frontMarkdown,
  notesMarkdown,
  onArchiveSet,
  onBackMarkdownChange,
  onCardEditorOpenChange,
  onConceptChange,
  onDescriptionChange,
  onFrontMarkdownChange,
  onNotesMarkdownChange,
  onOpenEditor,
  onSaveCard,
  onSaveSet,
  onSetMetadataOpenChange,
  onSubjectChange,
  onTagsChange,
  onTitleChange,
  onToggleEnrollment,
  onTopicChange,
  setMetadataEditorOpen,
  subject,
  tags,
  title,
  topic,
}: {
  backMarkdown: string;
  busy: boolean;
  concept: string;
  description: string;
  editingCard: FlashcardCardRecord | null;
  editorOpen: boolean;
  enrollmentStatus: "active" | "paused" | null | undefined;
  frontMarkdown: string;
  notesMarkdown: string;
  onArchiveSet: () => void;
  onBackMarkdownChange: (value: string) => void;
  onCardEditorOpenChange: (open: boolean) => void;
  onConceptChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFrontMarkdownChange: (value: string) => void;
  onNotesMarkdownChange: (value: string) => void;
  onOpenEditor: (card?: FlashcardCardRecord) => void;
  onSaveCard: () => void;
  onSaveSet: () => void;
  onSetMetadataOpenChange: (open: boolean) => void;
  onSubjectChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onToggleEnrollment: () => void;
  onTopicChange: (value: string) => void;
  setMetadataEditorOpen: boolean;
  subject: string;
  tags: string;
  title: string;
  topic: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Dialog
        onOpenChange={onSetMetadataOpenChange}
        open={setMetadataEditorOpen}
      >
        <DialogTrigger render={<Button variant="outline" />}>
          <Pencil className="size-4" />
          Edit mindset
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit mindset</DialogTitle>
            <DialogDescription>
              Update the title and description for this Mindset Set.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="flashcard-set-title">Title</Label>
              <Input
                id="flashcard-set-title"
                onChange={(event) => onTitleChange(event.target.value)}
                value={title}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flashcard-set-description">Description</Label>
              <Textarea
                id="flashcard-set-description"
                onChange={(event) => onDescriptionChange(event.target.value)}
                value={description}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={busy || !title.trim()}
              onClick={onSaveSet}
              type="button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button onClick={onToggleEnrollment} type="button" variant="outline">
        {enrollmentStatus === "active" ? (
          <>
            <Pause className="size-4" />
            Pause
          </>
        ) : (
          <>
            <BookOpenCheck className="size-4" />
            Enable Study
          </>
        )}
      </Button>

      <Button
        onClick={() => {
          onOpenEditor();
          onCardEditorOpenChange(true);
        }}
        type="button"
      >
        <Plus className="size-4" />
        Add Card
      </Button>

      <Dialog onOpenChange={onCardEditorOpenChange} open={editorOpen}>
        <DialogContent className="max-w-3xl" largeWidth>
          <DialogHeader>
            <DialogTitle>{editingCard ? "Edit card" : "Add card"}</DialogTitle>
            <DialogDescription>
              Markdown and KaTeX are supported on both sides of the card.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="flashcard-front">Front</Label>
              <Textarea
                id="flashcard-front"
                onChange={(event) => onFrontMarkdownChange(event.target.value)}
                placeholder="State the Routh-Hurwitz criterion."
                value={frontMarkdown}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flashcard-back">Back</Label>
              <Textarea
                id="flashcard-back"
                onChange={(event) => onBackMarkdownChange(event.target.value)}
                placeholder="The number of right-half-plane roots equals the number of sign changes in the first column."
                value={backMarkdown}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flashcard-notes">Notes</Label>
              <Textarea
                id="flashcard-notes"
                onChange={(event) => onNotesMarkdownChange(event.target.value)}
                placeholder="Add a derivation, caveat, or worked example."
                value={notesMarkdown}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flashcard-subject">Subject</Label>
              <Input
                id="flashcard-subject"
                onChange={(event) => onSubjectChange(event.target.value)}
                placeholder="Chemistry"
                value={subject}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="flashcard-topic">Topic</Label>
                <Input
                  id="flashcard-topic"
                  onChange={(event) => onTopicChange(event.target.value)}
                  placeholder="Thermodynamics"
                  value={topic}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="flashcard-concept">Concept</Label>
                <Input
                  id="flashcard-concept"
                  onChange={(event) => onConceptChange(event.target.value)}
                  placeholder="Gibbs free energy"
                  value={concept}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flashcard-tags">Tags</Label>
              <Input
                id="flashcard-tags"
                onChange={(event) => onTagsChange(event.target.value)}
                placeholder="controls, exam-2"
                value={tags}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                busy ||
                !frontMarkdown.trim() ||
                !backMarkdown.trim() ||
                !subject.trim() ||
                !topic.trim() ||
                !concept.trim()
              }
              onClick={onSaveCard}
              type="button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        disabled={busy}
        onClick={onArchiveSet}
        type="button"
        variant="outline"
      >
        <Trash2 className="size-4" />
        Delete set
      </Button>
    </div>
  );
}
