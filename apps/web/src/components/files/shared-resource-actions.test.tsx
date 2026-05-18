import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

import { SharedResourceActions } from "@/components/files/shared-resource-actions";

describe("SharedResourceActions", () => {
  it("renders nothing when there are no destination workspaces", () => {
    const html = renderToStaticMarkup(
      <SharedResourceActions
        resourceLabel="file"
        token="token-1"
        workspaces={[]}
      />
    );

    expect(html).toBe("");
  });

  it("renders the copy workflow affordance for available workspaces", () => {
    const html = renderToStaticMarkup(
      <SharedResourceActions
        resourceLabel="folder"
        token="token-1"
        workspaces={[
          {
            name: "Aveniri",
            rootFolderId: "root-1",
            workspaceId: "workspace-1",
          },
          {
            name: "Research",
            rootFolderId: "root-2",
            workspaceId: "workspace-2",
          },
        ]}
      />
    );

    expect(html).toContain("Copy to my workspace");
    expect(html).toContain(
      "Duplicate this folder into one of your own workspaces."
    );
    expect(html).toContain(">Aveniri<");
    expect(html).toContain(">Research<");
    expect(html).toContain(">Copy<");
  });
});
