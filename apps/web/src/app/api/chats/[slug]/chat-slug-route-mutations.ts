import {
  branchChatForUser,
  deleteChatForUser,
  getWritableChatBySlugForUser,
  updateChatForUser,
} from "@avenire/database";
import { after, NextResponse } from "next/server";
import { invalidateChatReadCaches } from "@/lib/domain-cache";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import {
  buildChatInvalidateEvent,
  buildSpecificChatEvent,
  CHAT_SLUG_BRANCH_ERROR,
  CHAT_SLUG_DELETE_ERROR,
  CHAT_SLUG_UPDATE_ERROR,
  normalizeChatSlugPatch,
  resolveChatSlugRouteError,
} from "./chat-slug-route-model";

function scheduleChatMutationFollowUp(input: {
  action: "created" | "deleted" | "updated";
  chat: {
    slug: string;
    workspaceId: string;
  };
  publishedChat: unknown;
}) {
  after(async () => {
    try {
      await invalidateChatReadCaches(input.chat.workspaceId);
    } catch {
      // Best-effort cache cleanup after the mutation is already committed.
    }

    await Promise.allSettled([
      publishWorkspaceStreamEvent(
        buildSpecificChatEvent({
          workspaceUuid: input.chat.workspaceId,
          chatSlug: input.chat.slug,
          action: input.action,
          chat: input.publishedChat,
        })
      ),
      publishWorkspaceStreamEvent(
        buildChatInvalidateEvent({
          workspaceUuid: input.chat.workspaceId,
          chatSlug: input.chat.slug,
          action: input.action,
          chat: input.publishedChat,
        })
      ),
    ]);
  });
}

async function resolveOwnedChatMutationContext(input: {
  userId: string;
  slug: string;
}) {
  const chat = await getWritableChatBySlugForUser(input.userId, input.slug);
  if (chat?.readOnly) {
    return {
      response: NextResponse.json(
        { error: "Read-only Method" },
        { status: 403 }
      ),
    };
  }

  return { chat };
}

export async function handleChatSlugPatch(input: {
  body: { title?: unknown; pinned?: unknown; icon?: unknown };
  slug: string;
  userId: string;
}) {
  try {
    const context = await resolveOwnedChatMutationContext({
      userId: input.userId,
      slug: input.slug,
    });
    if ("response" in context) {
      return context.response;
    }

    const updated = await updateChatForUser(
      input.userId,
      input.slug,
      normalizeChatSlugPatch(input.body),
      context.chat?.workspaceId
    );

    if (!updated) {
      return NextResponse.json({ error: "Method not found" }, { status: 404 });
    }

    if (updated.workspaceId) {
      scheduleChatMutationFollowUp({
        action: "updated",
        chat: {
          slug: updated.slug,
          workspaceId: updated.workspaceId,
        },
        publishedChat: updated,
      });
    }

    return NextResponse.json({ chat: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveChatSlugRouteError(error, CHAT_SLUG_UPDATE_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function handleChatSlugBranch(input: {
  slug: string;
  userId: string;
}) {
  try {
    const context = await resolveOwnedChatMutationContext({
      userId: input.userId,
      slug: input.slug,
    });
    if ("response" in context) {
      return context.response;
    }

    const chat = await branchChatForUser(
      input.userId,
      input.slug,
      context.chat?.workspaceId
    );

    if (!chat) {
      return NextResponse.json({ error: "Method not found" }, { status: 404 });
    }

    if (chat.workspaceId) {
      scheduleChatMutationFollowUp({
        action: "created",
        chat: {
          slug: chat.slug,
          workspaceId: chat.workspaceId,
        },
        publishedChat: chat,
      });
    }

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveChatSlugRouteError(error, CHAT_SLUG_BRANCH_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function handleChatSlugDelete(input: {
  slug: string;
  userId: string;
}) {
  try {
    const context = await resolveOwnedChatMutationContext({
      userId: input.userId,
      slug: input.slug,
    });
    if ("response" in context) {
      return context.response;
    }

    const deleted = await deleteChatForUser(
      input.userId,
      input.slug,
      context.chat?.workspaceId
    );

    if (!deleted) {
      return NextResponse.json({ error: "Method not found" }, { status: 404 });
    }

    if (context.chat?.workspaceId) {
      scheduleChatMutationFollowUp({
        action: "deleted",
        chat: {
          slug: context.chat.slug,
          workspaceId: context.chat.workspaceId,
        },
        publishedChat: deleted,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveChatSlugRouteError(error, CHAT_SLUG_DELETE_ERROR),
      },
      { status: 500 }
    );
  }
}
