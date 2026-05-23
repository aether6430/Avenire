import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspacePaneInteractions } from "@/components/dashboard/use-workspace-pane-interactions";
import { WORKSPACE_PANE_REORDER_MIME } from "@/components/dashboard/workspace-pane-renderer-model";

type HookValue = ReturnType<typeof useWorkspacePaneInteractions>;

function renderHookValue(
  options: Parameters<typeof useWorkspacePaneInteractions>[0]
) {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useWorkspacePaneInteractions(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

function createDataTransferMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    dropEffect: "",
    effectAllowed: "",
    getData: (type: string) => store.get(type) ?? "",
    setData: (type: string, value: string) => {
      store.set(type, value);
    },
    setDragImage: vi.fn(),
  } as unknown as DataTransfer;
}

function createEvent(dataTransfer: DataTransfer) {
  return {
    currentTarget: {
      getBoundingClientRect: () => ({
        height: 100,
        left: 0,
        top: 0,
        width: 100,
      }),
    },
    dataTransfer,
    preventDefault: vi.fn(),
  } as unknown as React.DragEvent<HTMLDivElement>;
}

function createOptions() {
  return {
    focusPane: vi.fn(),
    movePaneToSplit: vi.fn(),
    openPane: vi.fn(),
    panes: [
      {
        id: "pane-target",
        route: { pathname: "/workspace", search: "" },
        rowId: "row-1",
        size: 100,
      },
    ],
    reorderPanes: vi.fn(),
    setPaneRoute: vi.fn(),
  } satisfies Parameters<typeof useWorkspacePaneInteractions>[0];
}

describe("useWorkspacePaneInteractions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      location: { origin: "https://app.example.com" },
      removeEventListener: vi.fn(),
      requestAnimationFrame: vi.fn((cb: FrameRequestCallback) => {
        cb(0);
        return 1;
      }),
    });
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        height: 0,
        width: 0,
      })),
    });
  });

  it("routes dropped workspace links through vertical top splits", () => {
    const options = createOptions();
    const hook = renderHookValue(options);
    const event = createEvent(
      createDataTransferMock({
        "text/uri-list": "/workspace/tasks",
      })
    );

    hook.handlePaneDrop(event, "pane-target", "top");

    expect(event.preventDefault).toHaveBeenCalled();
    expect(options.openPane).toHaveBeenCalledWith("/workspace/tasks", {
      sourcePaneId: "pane-target",
      splitDirection: "vertical",
      splitPlacement: "before",
    });
  });

  it("routes dragged panes through vertical bottom splits", () => {
    const options = createOptions();
    const hook = renderHookValue(options);
    const event = createEvent(
      createDataTransferMock({
        [WORKSPACE_PANE_REORDER_MIME]: "pane-source",
      })
    );

    hook.handlePaneDrop(event, "pane-target", "bottom");

    expect(event.preventDefault).toHaveBeenCalled();
    expect(options.movePaneToSplit).toHaveBeenCalledWith(
      "pane-source",
      "pane-target",
      {
        splitDirection: "vertical",
        splitPlacement: "after",
      }
    );
  });
});
