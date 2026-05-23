import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loadDataImportFoldersMock,
  loadDataImportsOverviewMock,
  saveDataImportDestinationMock,
} = vi.hoisted(() => ({
  loadDataImportFoldersMock: vi.fn(),
  loadDataImportsOverviewMock: vi.fn(),
  saveDataImportDestinationMock: vi.fn(),
}));

vi.mock("@/components/settings/data-imports-client", () => ({
  loadDataImportFolders: loadDataImportFoldersMock,
  loadDataImportsOverview: loadDataImportsOverviewMock,
  saveDataImportDestination: saveDataImportDestinationMock,
}));

import { useDataImportsDestination } from "@/components/settings/use-data-imports-destination";

type HookValue = ReturnType<typeof useDataImportsDestination>;

const useDataImportsDestinationSource = readFileSync(
  resolve(import.meta.dirname, "./use-data-imports-destination.ts"),
  "utf8"
);

function renderHookValue(
  options: Parameters<typeof useDataImportsDestination>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useDataImportsDestination(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useDataImportsDestination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadDataImportsOverviewMock.mockResolvedValue({
      destination: {
        createdAt: "",
        folderId: "folder-1",
        folderName: "Inbox",
        id: "destination-1",
        label: "Inbox",
        organizationId: "org-1",
        updatedAt: "",
        workspaceId: "workspace-1",
        workspaceName: "Aveniri",
      },
      providers: {
        google: { ready: true },
        notion: { ready: false },
      },
    });
    loadDataImportFoldersMock.mockResolvedValue({
      folders: [
        {
          id: "root-1",
          name: "Workspace",
          parentId: null,
          readOnly: false,
        },
        {
          id: "folder-1",
          name: "Inbox",
          parentId: "root-1",
          readOnly: false,
        },
      ],
      rootFolderId: "root-1",
    });
    saveDataImportDestinationMock.mockResolvedValue({
      createdAt: "",
      folderId: "folder-1",
      folderName: "Inbox",
      id: "destination-1",
      label: "Inbox",
      organizationId: "org-1",
      updatedAt: "",
      workspaceId: "workspace-1",
      workspaceName: "Aveniri",
    });
  });

  it("loads imports overview through the dedicated transport", async () => {
    const hook = renderHookValue({
      workspaces: [
        {
          name: "Aveniri",
          organizationId: "org-1",
          rootFolderId: "root-1",
          workspaceId: "workspace-1",
        },
      ],
    });

    await hook.loadOverview();

    expect(loadDataImportsOverviewMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed when a destination has not been fully selected yet", async () => {
    const hook = renderHookValue({
      workspaces: [
        {
          name: "Aveniri",
          organizationId: "org-1",
          rootFolderId: "root-1",
          workspaceId: "workspace-1",
        },
      ],
    });

    await expect(hook.ensureSavedDestination()).rejects.toThrow(
      "Choose and save an import destination first."
    );
    expect(saveDataImportDestinationMock).not.toHaveBeenCalled();
    expect(useDataImportsDestinationSource).toContain(
      'from "@/components/settings/data-imports-client"'
    );
    expect(useDataImportsDestinationSource).toContain(
      'from "@/components/settings/settings-data-imports-destination-runtime-model"'
    );
    expect(useDataImportsDestinationSource).not.toContain("fetch(");
    expect(useDataImportsDestinationSource).not.toContain("/api/imports/");
  });
});
