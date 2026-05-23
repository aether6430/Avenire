import { NextResponse } from "next/server";
import {
  getChatBySlugForUser,
  getWritableChatBySlugForUser,
} from "@/lib/chat-data";
import { createApiLogger } from "@/lib/observability";
import { getSessionUser } from "@/lib/workspace";
import {
  CHAT_SHARE_CONTEXT_ERROR,
  resolveChatShareRouteError,
} from "./chat-share-route-model";

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
  const { slug } = await input.params;
  const apiLogger = createApiLogger({
    request: input.request,
    route: input.route,
    feature: "chat-sharing",
    userId: null,
  });
  void apiLogger.requestStarted();

  try {
    const user = await getSessionUser();
    if (!user) {
      void apiLogger.requestFailed(401, "Unauthorized");
      return {
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const chat = await getChatBySlugForUser(user.id, slug);
    if (
      !chat ||
      (input.requireOwnedChatRecord && chat.ownerUserId !== user.id)
    ) {
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

    const writableChat = await getWritableChatBySlugForUser(
      user.id,
      slug,
      chat.workspaceId
    );
    if (writableChat?.readOnly) {
      void apiLogger.requestFailed(403, "Read-only Method", { slug });
      return {
        response: NextResponse.json(
          { error: "Read-only Method" },
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
  } catch (error) {
    void apiLogger.requestFailed(500, error, { slug });
    return {
      response: NextResponse.json(
        {
          error: resolveChatShareRouteError(error, CHAT_SHARE_CONTEXT_ERROR),
        },
        { status: 500 }
      ),
    };
  }
}
