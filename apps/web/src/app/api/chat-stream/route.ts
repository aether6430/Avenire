import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { getChatBySlugForUser } from "@/lib/chat-data";
import {
  buildDurableChatStreamReadUrl,
  getDurableChatStreamReadHeaders,
  parseChatStreamPath,
} from "@/lib/durable-chat-streams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function copyStreamingHeaders(response: Response) {
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "connection" || lowerKey === "transfer-encoding") {
      return;
    }
    headers.set(key, value);
  });
  headers.set("Cache-Control", "no-store");
  return headers;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response(null, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const streamPath = parseChatStreamPath(requestUrl.searchParams.get("path"));
  if (!streamPath) {
    return Response.json(
      { error: "Missing or invalid chat stream path" },
      { status: 400 }
    );
  }

  const chat = await getChatBySlugForUser(
    session.user.id,
    streamPath.chatSlug,
    streamPath.workspaceId
  );
  if (!chat) {
    return new Response(null, { status: 404 });
  }

  const upstreamUrl = new URL(buildDurableChatStreamReadUrl(streamPath.path));
  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (key !== "path") {
      upstreamUrl.searchParams.append(key, value);
    }
  }

  const acceptHeader = request.headers.get("accept");
  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      ...(acceptHeader ? { Accept: acceptHeader } : {}),
      ...(getDurableChatStreamReadHeaders() ?? {}),
    },
    method: "GET",
  });

  return new Response(upstreamResponse.body, {
    headers: copyStreamingHeaders(upstreamResponse),
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });
}
