import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useDataImportsDestinationMock } = vi.hoisted(() => ({
  useDataImportsDestinationMock: vi.fn(),
}));

vi.mock("@/components/settings/use-data-imports-destination", () => ({
  useDataImportsDestination: useDataImportsDestinationMock,
}));

import { useDataImports } from "@/components/settings/use-data-imports";

type HookValue = ReturnType<typeof useDataImports>;

function renderHookValue(
  options: Parameters<typeof useDataImports>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useDataImports(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useDataImports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataImportsDestinationMock.mockReturnValue({
      googleStatus: { ready: true },
      hasSelectedDestination: false,
      loadOverview: async () => {},
      notionStatus: { ready: false },
      overviewLoading: false,
      overviewStatus: null,
    });
  });

  it("composes import destination runtime with source selection state", () => {
    const workspaces = [
      {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ];

    const hook = renderHookValue({ workspaces });

    expect(useDataImportsDestinationMock).toHaveBeenCalledWith({ workspaces });
    expect(hook).toMatchObject({
      destinationRuntime: expect.objectContaining({
        googleStatus: { ready: true },
        notionStatus: { ready: false },
      }),
      selectedSource: null,
    });
  });
});
