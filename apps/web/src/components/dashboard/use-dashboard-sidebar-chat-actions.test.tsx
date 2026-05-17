import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard/dashboard-sidebar-runtime-model", () => ({
  parseDashboardSidebarResponse: vi.fn(async (response: Response) =>
    response.ok ? await response.json() : null
  ),
}));

import { useDashboardSidebarChatActions } from "@/components/dashboard/use-dashboard-sidebar-chat-actions";

type HookValue = ReturnType<typeof useDashboardSidebarChatActions>;

function buildChat(overrides: Record<string, unknown>) {
  return {
    id: "chat-1",
    lastMessageAt: "2026-05-18T12:00:00.000Z",
    pinned: false,
    slug: "chat-1",
    title: "Momentum Review",
    ...overrides,
  } as never;
}

function renderHookValue(
  options: Parameters<typeof useDashboardSidebarChatActions>[0]
) {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useDashboardSidebarChatActions(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useDashboardSidebarChatActions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates to a new chat and updates chats on successful rename/pin changes", async () => {
    const navigate = vi.fn();
    const setChats = vi.fn();
    const hook = renderHookValue({
      activeChatSlug: "chat-1",
      chats: [buildChat({ slug: "chat-1" }), buildChat({ slug: "chat-2" })],
      navigate,
      refreshRoute: vi.fn(),
      setActiveChatSlugOverride: vi.fn(),
      setChats,
    });

    await hook.createChat();
    expect(navigate).toHaveBeenCalledWith("/workspace/chats/new");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          chat: buildChat({ pinned: true, slug: "chat-1", title: "Renamed" }),
        }),
        { status: 200 }
      )
    );

    await hook.updateChat("chat-1", { pinned: true, title: "Renamed" });
    expect(setChats).toHaveBeenCalledWith(expect.any(Function));
    const updater = setChats.mock.calls[0]?.[0] as (
      chats: ReturnType<typeof buildChat>[]
    ) => ReturnType<typeof buildChat>[];
    expect(
      updater([buildChat({ slug: "chat-1" }), buildChat({ slug: "chat-2" })])
    ).toEqual([
      buildChat({ pinned: true, slug: "chat-1", title: "Renamed" }),
      buildChat({ slug: "chat-2" }),
    ]);
  });

  it("surfaces explicit action errors and clears active chat selection after successful delete", async () => {
    const navigate = vi.fn();
    const refreshRoute = vi.fn();
    const setActiveChatSlugOverride = vi.fn();
    const setChats = vi.fn();
    const hook = renderHookValue({
      activeChatSlug: "chat-1",
      chats: [buildChat({ slug: "chat-1" }), buildChat({ slug: "chat-2" })],
      navigate,
      refreshRoute,
      setActiveChatSlugOverride,
      setChats,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 })
    );
    await hook.deleteChat("chat-1");
    expect(setChats).not.toHaveBeenCalled();
    expect(setActiveChatSlugOverride).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 })
    );
    await hook.deleteChat("chat-1");
    expect(setChats).toHaveBeenLastCalledWith([buildChat({ slug: "chat-2" })]);
    expect(setActiveChatSlugOverride).toHaveBeenCalledWith(null);
    expect(navigate).toHaveBeenCalledWith("/workspace/chats/new");
    expect(refreshRoute).toHaveBeenCalled();
  });
});
