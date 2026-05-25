import { NextResponse } from "next/server";
import { resolveChatDirectoryRouteError } from "../../chats/chat-directory-route-model";
import { handleChatHistoryRouteGet } from "./chat-history-route-get";

export async function GET() {
  try {
    return await handleChatHistoryRouteGet();
  } catch (error) {
    const failure = resolveChatDirectoryRouteError(error, {
      fallback: "Unable to load chats.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
