import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { getChatBySlugForUser } from "@/lib/chat-data";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import {
  clearActiveStreamId,
  getActiveStreamId,
  getRedisClient,
  getRedisSubscriber,
} from "../../chat-stream-store";
import {
  buildChatStreamNoStoreHeaders,
  buildChatStreamSuccessHeaders,
} from "./chat-stream-route-model";

export async function handleChatStreamRouteGet(input: {
  chatSlug: string;
  headers: Record<string, string>;
  sessionUserId: string;
  workspaceOrganizationId: string | null;
}) {
  const workspace = await resolveWorkspaceForUser(
    input.sessionUserId,
    input.workspaceOrganizationId
  );
  if (!workspace) {
    return new Response(null, { status: 404 });
  }

  const chat = await getChatBySlugForUser(
    input.sessionUserId,
    input.chatSlug,
    workspace.workspaceId
  );
  if (!chat) {
    return new Response(null, { status: 404 });
  }

  const activeStreamId = await getActiveStreamId(input.chatSlug);
  if (!activeStreamId) {
    return new Response(null, {
      status: 204,
      headers: buildChatStreamNoStoreHeaders(),
    });
  }

  try {
    const streamContext = createResumableStreamContext({
      waitUntil: after,
      publisher: await getRedisClient(),
      subscriber: await getRedisSubscriber(),
    });

    const stream = await streamContext.resumeExistingStream(activeStreamId);
    if (!stream) {
      await clearActiveStreamId(input.chatSlug, activeStreamId);
      return new Response(null, {
        status: 204,
        headers: buildChatStreamNoStoreHeaders(),
      });
    }

    return new Response(stream, {
      headers: buildChatStreamSuccessHeaders(input.headers),
    });
  } catch (error) {
    console.error("Failed to resume chat stream", {
      chatId: input.chatSlug,
      error,
    });
    return new Response(null, {
      status: 204,
      headers: buildChatStreamNoStoreHeaders(),
    });
  }
}
