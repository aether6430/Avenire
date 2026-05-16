import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExplorerItemInteractions } from "@/components/files/explorer/use-explorer-item-interactions";

type HookValue = ReturnType<typeof useExplorerItemInteractions>;

function renderHookValue(
  options: Parameters<typeof useExplorerItemInteractions>[0]
) {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useExplorerItemInteractions(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useExplorerItemInteractions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("handles desktop context selection and click filtering", () => {
    const selection = {
      getSelectedIds: () => new Set(["file_a"]),
      setItemSelected: vi.fn(),
      setSelection: vi.fn(),
      startDragSelection: vi.fn(),
      toggleSelection: vi.fn(),
    };
    const contextActionIdsRef = {
      current: null as { ids: string[]; itemId: string } | null,
    };

    const hook = renderHookValue({
      contextActionIdsRef,
      isMobile: false,
      itemActionTargetSelector: "button, a",
      mobileLongPressDelayMs: 450,
      mobileLongPressTimerRef: { current: null },
      mobileSuppressClickRef: { current: null },
      onMobileCanvasLongPress: vi.fn(),
      selection,
      triggerHaptic: vi.fn(),
    });

    const actionTarget = {
      closest: (selector: string) => (selector === "button, a" ? {} : null),
    };
    const actionEvent = {
      detail: 2,
      target: actionTarget,
    } as React.MouseEvent<HTMLElement>;
    const idleTarget = {
      closest: () => null,
    };
    const openSpy = vi.fn();

    expect(hook.shouldIgnoreItemClick(actionEvent)).toBe(true);
    hook.handleOpenOnDoubleClick(
      { detail: 2, target: idleTarget } as React.MouseEvent<HTMLElement>,
      openSpy
    );
    expect(openSpy).toHaveBeenCalledTimes(1);

    hook.handleItemContextMenu(
      {
        preventDefault: vi.fn(),
        target: idleTarget,
      } as React.MouseEvent<HTMLElement>,
      "file_a"
    );
    expect(contextActionIdsRef.current).toEqual({
      ids: ["file_a"],
      itemId: "file_a",
    });
    expect(selection.setSelection).not.toHaveBeenCalled();
  });

  it("handles mobile click, long-press, and canvas pointer behavior", () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", {
      addEventListener,
      removeEventListener,
    });

    const triggerHaptic = vi.fn();
    const setItemSelected = vi.fn();
    const toggleSelection = vi.fn();
    const startDragSelection = vi.fn();
    const selection = {
      getSelectedIds: () => new Set<string>(),
      setItemSelected,
      setSelection: vi.fn(),
      startDragSelection,
      toggleSelection,
    };
    const mobileLongPressTimerRef = {
      current: null as ReturnType<typeof setTimeout> | null,
    };
    const mobileSuppressClickRef = { current: null as string | null };
    const onMobileCanvasLongPress = vi.fn();

    const hook = renderHookValue({
      contextActionIdsRef: { current: null },
      isMobile: true,
      itemActionTargetSelector: "button, a",
      mobileLongPressDelayMs: 1,
      mobileLongPressTimerRef,
      mobileSuppressClickRef,
      onMobileCanvasLongPress,
      selection,
      triggerHaptic,
    });

    const openSpy = vi.fn();
    hook.handleMobileItemClick("file_a", openSpy);
    expect(triggerHaptic).toHaveBeenCalledWith("success");
    expect(openSpy).toHaveBeenCalledTimes(1);

    mobileSuppressClickRef.current = "file_a";
    hook.handleMobileItemClick("file_a", openSpy);
    expect(mobileSuppressClickRef.current).toBeNull();

    hook.beginMobileItemLongPress("file_b");
    expect(addEventListener).toHaveBeenCalled();
    expect(mobileLongPressTimerRef.current).not.toBeNull();
    vi.runAllTimers();
    expect(setItemSelected).toHaveBeenCalledWith("file_b", true);
    expect(triggerHaptic).toHaveBeenCalledWith("selection");

    hook.handleMobileCanvasPointerDown({
      button: 0,
      pointerType: "touch",
      target: { closest: () => null },
    } as React.PointerEvent<HTMLDivElement>);
    vi.runAllTimers();
    expect(onMobileCanvasLongPress).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalled();

    hook.handleMobileCanvasPointerDown({
      button: 0,
      pointerType: "mouse",
      target: { closest: () => null },
    } as React.PointerEvent<HTMLDivElement>);
    expect(startDragSelection).toHaveBeenCalled();
  });
});
