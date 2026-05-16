import { handleChatDirectoryRoutePost } from "./chat-directory-route-post";

export async function POST(request: Request) {
  return await handleChatDirectoryRoutePost({
    request,
  });
}
