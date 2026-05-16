import { NextResponse } from "next/server";
import { getChatBySlugForUser, isChatOwnerForUser } from "@/lib/chat-data";
import { createApiLogger } from "@/lib/observability";
import { getSessionUser } from "@/lib/workspace";

interface MissingChatPolicy {
  error: string;
  status: number;
}

interface MissingWorkspacePolicy {
  error: string;
  status: number;
}

export interface ChatShareRouteContext {
  apiLogger: ReturnType<typeof createApiLogger>;
  chat: NonNullable<Awaited<ReturnType<typeof getChatBySlugForUser>>>;
  slug: string;
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  workspaceUuid: string;
}

export async function resolveChatShareRouteContext(input: {
  params: Promise<{ slug: string }>;
  request: Request;
  route: string;
  missingChat: MissingChatPolicy;
  missingWorkspace: MissingWorkspacePolicy;
  requireOwnedChatRecord?: boolean;
}) {
  const user = await getSessionUser();
  const { slug } = await input.params;
  const apiLogger = createApiLogger({
    request: input.request,
    route: input.route,
    feature: "chat-sharing",
    userId: user?.id ?? null,
  });
  void apiLogger.requestStarted();

  if (!user) {
    void apiLogger.requestFailed(401, "Unauthorized");
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const chat = await getChatBySlugForUser(user.id, slug);
  if (!chat || (input.requireOwnedChatRecord && chat.ownerUserId !== user.id)) {
    void apiLogger.requestFailed(
      input.missingChat.status,
      input.missingChat.error,
      {
        slug,
      }
    );
    return {
      response: NextResponse.json(
        { error: input.missingChat.error },
        { status: input.missingChat.status }
      ),
    };
  }

  const isOwner = await isChatOwnerForUser(user.id, slug, chat.workspaceId);
  if (!isOwner) {
    void apiLogger.requestFailed(403, "Read-only method", { slug });
    return {
      response: NextResponse.json(
        { error: "Read-only method" },
        { status: 403 }
      ),
    };
  }

  if (!chat.workspaceId) {
    void apiLogger.requestFailed(
      input.missingWorkspace.status,
      input.missingWorkspace.error,
      { slug }
    );
    return {
      response: NextResponse.json(
        { error: input.missingWorkspace.error },
        { status: input.missingWorkspace.status }
      ),
    };
  }

  return {
    apiLogger,
    chat,
    slug,
    user,
    workspaceUuid: chat.workspaceId,
  } satisfies ChatShareRouteContext;
}
