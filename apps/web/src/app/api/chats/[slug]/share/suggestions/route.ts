import { resolveChatShareRouteContext } from "../chat-share-route-context";
import {
  CHAT_SHARE_CONTEXT_ERROR,
  resolveChatShareRouteError,
} from "../chat-share-route-model";
import { handleChatShareSuggestionsGet } from "./chat-share-suggestions-get";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const routeContext = await resolveChatShareRouteContext({
      request,
      route: "/api/chats/[slug]/share/suggestions",
      params: context.params,
      missingChat: { status: 404, error: "Method not found" },
      missingWorkspace: { status: 404, error: "Workspace not found" },
    });
    if ("response" in routeContext) {
      return routeContext.response;
    }

    return await handleChatShareSuggestionsGet({
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
