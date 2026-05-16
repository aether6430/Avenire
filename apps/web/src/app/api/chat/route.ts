import type { ApolloModelName } from "@avenire/ai";
import type { UIMessage } from "@avenire/ai/message-types";
import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { deleteChatForUser } from "@/lib/chat-data";
import { invalidateChatReadCaches } from "@/lib/domain-cache";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import "@/lib/learning-automation";
import { createApiLogger } from "@/lib/observability";
import { handleEphemeralChatRequest } from "./chat-route-ephemeral";
import { formatError, logError } from "./chat-route-logging";
import { handlePersistedChatRequest } from "./chat-route-persisted";
import { handleSessionCloseChatRequest } from "./chat-route-session-close";
import { clearActiveStreamId, getActiveStreamId } from "./chat-stream-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const apiLogger = createApiLogger({
    request,
    route: "/api/chat",
    feature: "chat",
    userId: session?.user?.id ?? null,
  });
  apiLogger.requestStarted();

  try {
    if (!session?.user) {
      apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId =
      (session as { session?: { activeOrganizationId?: string | null } })
        .session?.activeOrganizationId ?? null;
    const workspace = await resolveWorkspaceForUser(
      session.user.id,
      activeOrganizationId
    );
    if (!workspace) {
      apiLogger.requestFailed(404, "Workspace not found");
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      kind?: "session-close";
      ephemeral?: boolean;
      messages?: UIMessage[];
      selectionBase64?: string | null;
      selectionMediaType?: string | null;
      workspaceUuid?: string;
      selectedModel?: ApolloModelName;
      chatId?: string;
      sessionId?: string;
      status?: string;
      userName?: string;
    };

    if (body.kind === "session-close") {
      return await handleSessionCloseChatRequest({
        apiLogger,
        chatId: body.chatId?.trim() ?? "",
        sessionId: body.sessionId?.trim() ?? "",
        userId: session.user.id,
        workspaceId: workspace.workspaceId,
      });
    }

    if (body.ephemeral) {
      return await handleEphemeralChatRequest({
        apiLogger,
        body,
        request,
        sessionUser: {
          id: session.user.id,
          name: session.user.name ?? null,
        },
        workspace: {
          rootFolderId: workspace.rootFolderId,
          workspaceId: workspace.workspaceId,
        },
      });
    }

    return await handlePersistedChatRequest({
      apiLogger,
      body,
      request,
      sessionUser: {
        id: session.user.id,
        name: session.user.name ?? null,
      },
      workspace: {
        rootFolderId: workspace.rootFolderId,
        workspaceId: workspace.workspaceId,
      },
    });
  } catch (error) {
    logError("Unhandled chat POST error", { error: formatError(error) });
    apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const apiLogger = createApiLogger({
    request,
    route: "/api/chat",
    feature: "chat",
    userId: session?.user?.id ?? null,
  });
  apiLogger.requestStarted();

  try {
    if (!session?.user) {
      apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      apiLogger.requestFailed(400, "Missing chat id");
      return NextResponse.json({ error: "Missing chat id" }, { status: 400 });
    }

    const activeOrganizationId =
      (session as { session?: { activeOrganizationId?: string | null } })
        .session?.activeOrganizationId ?? null;
    const workspace = await resolveWorkspaceForUser(
      session.user.id,
      activeOrganizationId
    );
    if (!workspace) {
      apiLogger.requestFailed(404, "Workspace not found");
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const deleted = await deleteChatForUser(
      session.user.id,
      id,
      workspace.workspaceId
    );
    if (!deleted) {
      apiLogger.requestFailed(404, "Method not found", { chatId: id });
      return NextResponse.json({ error: "Method not found" }, { status: 404 });
    }

    const activeStreamId = await getActiveStreamId(id);
    if (activeStreamId) {
      await clearActiveStreamId(id, activeStreamId);
    }
    await invalidateChatReadCaches(workspace.workspaceId);
    apiLogger.featureUsed("chat.delete", { chatId: id });
    apiLogger.requestSucceeded(200, { chatId: id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("Unhandled chat DELETE error", { error: formatError(error) });
    apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
