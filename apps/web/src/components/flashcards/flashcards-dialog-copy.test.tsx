import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({
    children,
    render,
  }: {
    children: ReactNode;
    render?: ReactNode;
  }) => (
    <div>
      {render}
      {children}
    </div>
  ),
}));

vi.mock("@avenire/ui/components/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@avenire/ui/components/label", () => ({
  Label: ({ children, ...props }: { children: ReactNode }) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock("@avenire/ui/components/textarea", () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

import { FlashcardSetDetailActions } from "@/components/flashcards/flashcard-set-detail-actions";
import { FlashcardsDashboardCreateDialog } from "@/components/flashcards/flashcards-dashboard-create-dialog";

describe("Mindset dialog copy", () => {
  it("uses explicit Mindset wording in the create dialog", () => {
    const html = renderToStaticMarkup(
      <FlashcardsDashboardCreateDialog
        runtime={{
          busy: false,
          createOpen: true,
          createSet: async () => {},
          createStatus: null,
          dashboard: {
            cardSnapshots: [],
            dueCount: 0,
            newCount: 0,
            reviewCount7d: 0,
            reviewCountToday: 0,
            sets: [],
            stateCounts: {},
          } as never,
          description: "",
          generationError: null,
          generationLoading: false,
          isMobile: false,
          mindsetOverviewErrorMessage: null,
          openReviewTarget: () => {},
          openSet: () => {},
          orderedSets: [],
          prefetchSet: () => {},
          reviewTarget: null,
          selectedSet: null,
          selectedSetId: null,
          selectedSnapshots: [],
          setCreateOpen: () => {},
          setDescription: () => {},
          setSelectedSetId: () => {},
          setTags: () => {},
          setTitle: () => {},
          tags: "",
          title: "",
        }}
      />
    );

    expect(html).toContain("New Mindset Set");
    expect(html).toContain("Create Mindset Set");
    expect(html).toContain("Shared Mindset Sets stay at workspace scope.");
    expect(html).not.toContain("New Set");
    expect(html).not.toContain("Create set");
  });

  it("uses explicit Mindset wording in the metadata edit dialog", () => {
    const html = renderToStaticMarkup(
      <FlashcardSetDetailActions
        backMarkdown=""
        busy={false}
        concept=""
        description=""
        editingCard={null}
        editorOpen={false}
        enrollmentStatus="active"
        frontMarkdown=""
        notesMarkdown=""
        onArchiveSet={() => {}}
        onBackMarkdownChange={() => {}}
        onCardEditorOpenChange={() => {}}
        onConceptChange={() => {}}
        onDescriptionChange={() => {}}
        onFrontMarkdownChange={() => {}}
        onNotesMarkdownChange={() => {}}
        onOpenEditor={() => {}}
        onSaveCard={() => {}}
        onSaveSet={() => {}}
        onSetMetadataOpenChange={() => {}}
        onSubjectChange={() => {}}
        onTagsChange={() => {}}
        onTitleChange={() => {}}
        onToggleEnrollment={() => {}}
        onTopicChange={() => {}}
        setMetadataEditorOpen
        subject=""
        tags=""
        title=""
        topic=""
      />
    );

    expect(html).toContain("Edit mindset");
    expect(html).toContain(
      "Update the title and description for this Mindset Set."
    );
    expect(html).not.toContain("Edit set");
    expect(html).not.toContain("for this set.");
  });
});
