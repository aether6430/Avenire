import { resolveChatShareRouteContext } from "../chat-share-route-context";
import {
  CHAT_SHARE_CONTEXT_ERROR,
  resolveChatShareRouteError,
} from "../chat-share-route-model";
import { handleChatShareGrantsPost } from "./chat-share-grants-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const routeContext = await resolveChatShareRouteContext({
      request,
      route: "/api/chats/[slug]/share/grants",
      params: context.params,
      missingChat: { status: 404, error: "Method not found" },
      missingWorkspace: { status: 400, error: "Chat workspace missing" },
    });
    if ("response" in routeContext) {
      return routeContext.response;
    }

    return await handleChatShareGrantsPost({
      ...routeContext,
      request,
    });
  } catch (error) {
    return Response.json(
      {
        error: resolveChatShareRouteError(error, CHAT_SHARE_CONTEXT_ERROR),
      },
      { status: 500 }
    );
  }
}
