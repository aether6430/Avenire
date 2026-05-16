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

vi.mock("@/components/shared/email-suggestion-input", () => ({
  EmailSuggestionInput: ({
    onValueChange,
    value,
    ...props
  }: Record<string, unknown>) => (
    <input
      {...props}
      onChange={(event) =>
        typeof onValueChange === "function"
          ? onValueChange((event.target as HTMLInputElement).value)
          : undefined
      }
      value={typeof value === "string" ? value : ""}
    />
  ),
}));

import { ChatWorkspaceShareDialog } from "@/components/dashboard/chat-workspace-share-dialog";

describe("ChatWorkspaceShareDialog copy", () => {
  it("uses explicit Method sharing wording throughout the dialog", () => {
    const html = renderToStaticMarkup(
      <ChatWorkspaceShareDialog
        isOpen
        onCopyLink={() => {}}
        onGenerateLink={() => {}}
        onOpenChange={() => {}}
        onShareEmailChange={() => {}}
        onShareWithEmail={() => {}}
        shareBusy={false}
        shareEmail=""
        shareLink={null}
        shareStatus={null}
        shareSuggestions={[]}
      />
    );

    expect(html).toContain("Share method");
    expect(html).toContain(
      "Grant read-only access to this method by email or create a signed link."
    );
    expect(html).toContain("Share with people");
    expect(html).toContain("Grant access");
    expect(html).toContain("Method share link (7 days)");
    expect(html).toContain("Generate link");
    expect(html).toContain("Copy link");
    expect(html).not.toContain("Add people");
    expect(html).not.toContain(">Add<");
    expect(html).not.toContain(">Generate<");
    expect(html).not.toContain(">Copy<");
  });
});
