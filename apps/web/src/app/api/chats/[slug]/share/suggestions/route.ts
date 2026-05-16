import { resolveChatShareRouteContext } from "../chat-share-route-context";
import { handleChatShareSuggestionsGet } from "./chat-share-suggestions-get";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
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
}
