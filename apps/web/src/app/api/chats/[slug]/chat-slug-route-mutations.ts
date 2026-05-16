import { NextResponse } from "next/server";
import {
  branchChatForUser,
  deleteChatForUser,
  getChatBySlugForUser,
  isChatOwnerForUser,
  updateChatForUser,
} from "@/lib/chat-data";
import { invalidateChatReadCaches } from "@/lib/domain-cache";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import {
  buildChatInvalidateEvent,
  normalizeChatSlugPatch,
} from "./chat-slug-route-model";

async function resolveOwnedChatMutationContext(input: {
  userId: string;
  slug: string;
}) {
  const chat = await getChatBySlugForUser(input.userId, input.slug);
  const isOwner = await isChatOwnerForUser(
    input.userId,
    input.slug,
    chat?.workspaceId
  );

  if (!isOwner) {
    return {
      response: NextResponse.json(
        { error: "Read-only method" },
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
    await invalidateChatReadCaches(updated.workspaceId);

    void publishWorkspaceStreamEvent(
      buildChatInvalidateEvent({
        workspaceUuid: updated.workspaceId,
        chatSlug: updated.slug,
        action: "updated",
      })
    );
  }

  return NextResponse.json({ chat: updated });
}

export async function handleChatSlugBranch(input: {
  slug: string;
  userId: string;
}) {
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
    await invalidateChatReadCaches(chat.workspaceId);

    void publishWorkspaceStreamEvent(
      buildChatInvalidateEvent({
        workspaceUuid: chat.workspaceId,
        chatSlug: chat.slug,
        action: "created",
      })
    );
  }

  return NextResponse.json({ chat }, { status: 201 });
}

export async function handleChatSlugDelete(input: {
  slug: string;
  userId: string;
}) {
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
    await invalidateChatReadCaches(context.chat.workspaceId);

    void publishWorkspaceStreamEvent(
      buildChatInvalidateEvent({
        workspaceUuid: context.chat.workspaceId,
        chatSlug: context.chat.slug,
        action: "deleted",
      })
    );
  }

  return NextResponse.json({ ok: true });
}
