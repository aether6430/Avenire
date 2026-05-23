import { UI_MESSAGE_STREAM_HEADERS } from "@avenire/ai";
import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { handleChatStreamRouteGet } from "./chat-stream-route-get";
import {
  buildChatStreamInternalErrorResponse,
  buildChatStreamUnauthorizedResponse,
  resolveChatStreamActiveOrganizationId,
} from "./chat-stream-route-model";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return buildChatStreamUnauthorizedResponse();
    }

    const { id } = await context.params;
    return await handleChatStreamRouteGet({
      chatSlug: id,
      headers: UI_MESSAGE_STREAM_HEADERS,
      sessionUserId: session.user.id,
      workspaceOrganizationId: resolveChatStreamActiveOrganizationId(session),
    });
  } catch {
    return buildChatStreamInternalErrorResponse();
  }
}
