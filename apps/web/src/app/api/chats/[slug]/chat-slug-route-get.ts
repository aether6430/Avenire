import {
  getChatBySlugForUser,
  getMessagesByChatSlugForUser,
} from "@avenire/database";
import { NextResponse } from "next/server";
import {
  CHAT_SLUG_LOAD_ERROR,
  resolveChatSlugRouteError,
} from "./chat-slug-route-model";

export async function handleChatSlugGet(input: {
  slug: string;
  userId: string;
}) {
  try {
    const chat = await getChatBySlugForUser(input.userId, input.slug);

    if (!chat) {
      return NextResponse.json({ error: "Method not found" }, { status: 404 });
    }

    const messages =
      (await getMessagesByChatSlugForUser(input.userId, input.slug)) ?? [];

    return NextResponse.json({ chat, messages });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveChatSlugRouteError(error, CHAT_SLUG_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
