import { handleChatHistoryRouteGet } from "./chat-history-route-get";

export async function GET() {
  return await handleChatHistoryRouteGet();
}
