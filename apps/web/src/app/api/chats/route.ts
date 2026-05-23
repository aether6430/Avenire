import { NextResponse } from "next/server";
import { resolveChatDirectoryRouteError } from "./chat-directory-route-model";
import { handleChatDirectoryRoutePost } from "./chat-directory-route-post";

export async function POST(request: Request) {
  try {
    return await handleChatDirectoryRoutePost({
      request,
    });
  } catch (error) {
    const failure = resolveChatDirectoryRouteError(error, {
      fallback: "Unable to create method.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
