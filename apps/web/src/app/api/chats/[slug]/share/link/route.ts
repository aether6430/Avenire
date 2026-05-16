import { resolveChatShareRouteContext } from "../chat-share-route-context";
import { handleChatShareLinkPost } from "./chat-share-link-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const routeContext = await resolveChatShareRouteContext({
    request,
    route: "/api/chats/[slug]/share/link",
    params: context.params,
    missingChat: { status: 403, error: "Method not found" },
    missingWorkspace: { status: 400, error: "Chat workspace missing" },
    requireOwnedChatRecord: true,
  });
  if ("response" in routeContext) {
    return routeContext.response;
  }

  return await handleChatShareLinkPost({
    ...routeContext,
    request,
  });
}
