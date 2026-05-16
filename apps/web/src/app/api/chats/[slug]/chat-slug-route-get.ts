import { NextResponse } from "next/server";
import {
  getChatBySlugForUser,
  getMessagesByChatSlugForUser,
} from "@/lib/chat-data";

export async function handleChatSlugGet(input: {
  slug: string;
  userId: string;
}) {
  const chat = await getChatBySlugForUser(input.userId, input.slug);

  if (!chat) {
    return NextResponse.json({ error: "Method not found" }, { status: 404 });
  }

  const messages =
    (await getMessagesByChatSlugForUser(input.userId, input.slug)) ?? [];

  return NextResponse.json({ chat, messages });
}
