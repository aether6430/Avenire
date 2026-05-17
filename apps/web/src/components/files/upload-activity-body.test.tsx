import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { UploadActivityBody } from "@/components/files/upload-activity-body";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children?: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@avenire/ui/components/drawer", () => ({
  DrawerClose: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("@avenire/ui/components/empty", () => ({
  Empty: ({ children, ...props }: { children?: ReactNode }) => (
    <section {...props}>{children}</section>
  ),
  EmptyDescription: ({ children }: { children?: ReactNode }) => (
    <p>{children}</p>
  ),
  EmptyHeader: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  EmptyMedia: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  EmptyTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@avenire/ui/components/spinner", () => ({
  Spinner: () => <span data-spinner="1" />,
}));

describe("UploadActivityBody", () => {
  it("renders an explicit load failure instead of a calm empty activity state", () => {
    const html = renderToStaticMarkup(
      <UploadActivityBody
        completedCount={0}
        failedCount={0}
        loadFailed
        loading={false}
        onClearCompleted={() => {}}
        onClose={() => {}}
        queue={[]}
        uploadCount={0}
      />
    );

    expect(html).toContain("Unable to load upload activity.");
    expect(html).toContain(
      "Try again in a moment to reload recent uploads and ingestion jobs."
    );
    expect(html).not.toContain("No activity yet");
  });
});
