import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  importGoogleDriveFilesMock,
  linkSocialMock,
  loadGooglePickerTokenMock,
  selectGoogleDriveImportFileIdsMock,
} = vi.hoisted(() => ({
  importGoogleDriveFilesMock: vi.fn(),
  linkSocialMock: vi.fn(),
  loadGooglePickerTokenMock: vi.fn(),
  selectGoogleDriveImportFileIdsMock: vi.fn(),
}));

vi.mock("@avenire/auth/app-client", () => ({
  linkSocial: linkSocialMock,
}));

vi.mock("@/components/settings/data-imports-client", () => ({
  importGoogleDriveFiles: importGoogleDriveFilesMock,
  loadGooglePickerToken: loadGooglePickerTokenMock,
}));

vi.mock("@/components/settings/data-imports-google-picker", () => ({
  selectGoogleDriveImportFileIds: selectGoogleDriveImportFileIdsMock,
}));

import { useDataImportsGoogle } from "@/components/settings/use-data-imports-google";

type HookValue = ReturnType<typeof useDataImportsGoogle>;

function renderHookValue(
  options: Parameters<typeof useDataImportsGoogle>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useDataImportsGoogle(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useDataImportsGoogle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadGooglePickerTokenMock.mockResolvedValue("token-1");
    selectGoogleDriveImportFileIdsMock.mockResolvedValue(["file-1", "file-2"]);
    importGoogleDriveFilesMock.mockResolvedValue([{ id: "import-1" }]);
  });

  it("routes Google connection through social auth with import callback/scopes", async () => {
    const hook = renderHookValue({
      ensureSavedDestination: async () => null,
      googleStatus: null,
      hasSelectedDestination: false,
      loadOverview: async () => {},
      pickerApiKey: "api-key",
      pickerAppId: "app-id",
    });

    await hook.connectGoogleDrive();

    expect(linkSocialMock).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackURL: expect.stringContaining("settingsTab=data"),
        provider: "google",
      })
    );
  });

  it("opens the picker only after saving destination and then imports selected files", async () => {
    const ensureSavedDestination = vi.fn().mockResolvedValue({
      folderId: "folder-1",
      workspaceId: "workspace-1",
    });
    const loadOverview = vi.fn();
    const hook = renderHookValue({
      ensureSavedDestination,
      googleStatus: {
        accountId: "google-1",
        configured: true,
        connected: true,
        hasRefreshToken: true,
        hasUsableAccessToken: true,
        ready: true,
        scopes: [],
      },
      hasSelectedDestination: true,
      loadOverview,
      pickerApiKey: "api-key",
      pickerAppId: "app-id",
    });

    await hook.handleOpenGooglePicker();

    expect(ensureSavedDestination).toHaveBeenCalledTimes(1);
    expect(loadGooglePickerTokenMock).toHaveBeenCalledTimes(1);
    expect(selectGoogleDriveImportFileIdsMock).toHaveBeenCalledWith({
      accessToken: "token-1",
      apiKey: "api-key",
      appId: "app-id",
    });
    expect(importGoogleDriveFilesMock).toHaveBeenCalledWith([
      "file-1",
      "file-2",
    ]);
    expect(loadOverview).toHaveBeenCalledTimes(1);
  });
});
