import { resolveChatShareRouteContext } from "../chat-share-route-context";
import { handleChatShareGrantsPost } from "./chat-share-grants-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
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
}
