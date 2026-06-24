import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { getChatBySlugForUser } from "@/lib/chat-data";
import {
  buildDurableChatStreamReadProxyUrl,
  parseChatStreamPath,
} from "@/lib/durable-chat-streams";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import {
  clearActiveStreamId,
  getActiveStreamId,
} from "../../chat-stream-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response(null, { status: 401 });
  }

  const { id } = await context.params;
  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const workspace = await resolveWorkspaceForUser(
    session.user.id,
    activeOrganizationId
  );
  if (!workspace) {
    return new Response(null, { status: 404 });
  }

  const activeStreamPath = await getActiveStreamId(id);
  if (!activeStreamPath) {
    return new Response(null, {
      headers: { "Cache-Control": "no-store" },
      status: 204,
    });
  }

  const streamPath = parseChatStreamPath(activeStreamPath);
  if (
    !streamPath ||
    streamPath.chatSlug !== id ||
    streamPath.workspaceId !== workspace.workspaceId
  ) {
    await clearActiveStreamId(id, activeStreamPath);
    return new Response(null, {
      headers: { "Cache-Control": "no-store" },
      status: 204,
    });
  }

  const chat = await getChatBySlugForUser(
    session.user.id,
    id,
    workspace.workspaceId
  );
  if (!chat) {
    await clearActiveStreamId(id, activeStreamPath);
    return new Response(null, {
      headers: { "Cache-Control": "no-store" },
      status: 204,
    });
  }

  const streamUrl = buildDurableChatStreamReadProxyUrl(
    request,
    streamPath.path
  );
  return Response.json(
    { streamUrl },
    {
      headers: {
        "Cache-Control": "no-store",
        Location: streamUrl,
      },
      status: 200,
    }
  );
}
