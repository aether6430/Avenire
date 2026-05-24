import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { importNotionPagesMock, linkSocialMock, loadNotionImportPagesMock } =
  vi.hoisted(() => ({
    importNotionPagesMock: vi.fn(),
    linkSocialMock: vi.fn(),
    loadNotionImportPagesMock: vi.fn(),
  }));

vi.mock("@avenire/auth/client", () => ({
  linkSocial: linkSocialMock,
}));

vi.mock("@/components/settings/data-imports-client", () => ({
  importNotionPages: importNotionPagesMock,
  loadNotionImportPages: loadNotionImportPagesMock,
}));

import { useDataImportsNotion } from "@/components/settings/use-data-imports-notion";

type HookValue = ReturnType<typeof useDataImportsNotion>;

function renderHookValue(
  options: Parameters<typeof useDataImportsNotion>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useDataImportsNotion(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useDataImportsNotion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadNotionImportPagesMock.mockResolvedValue([
      {
        id: "page-1",
        lastEditedTime: "2026-05-18T00:00:00.000Z",
        title: "Linear Algebra",
        url: "https://notion.so/page-1",
      },
    ]);
    importNotionPagesMock.mockResolvedValue([{ id: "import-1" }]);
  });

  it("routes Notion connection through social auth with the import callback", async () => {
    const hook = renderHookValue({
      ensureSavedDestination: async () => null,
      loadOverview: async () => {},
      notionStatus: null,
    });

    await hook.connectNotion();

    expect(linkSocialMock).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackURL: expect.stringContaining("settingsTab=data"),
        provider: "notion",
      })
    );
  });

  it("loads importable Notion pages through the data-import transport", async () => {
    const hook = renderHookValue({
      ensureSavedDestination: async () => null,
      loadOverview: async () => {},
      notionStatus: {
        accountId: "notion-1",
        configured: true,
        connected: true,
        hasRefreshToken: true,
        hasUsableAccessToken: true,
        ready: true,
        scopes: [],
      },
    });

    await hook.handleLoadNotionPages();

    expect(loadNotionImportPagesMock).toHaveBeenCalledTimes(1);
  });
});
