import { NextResponse } from "next/server";
import { grantResourceToUserByEmail } from "@/lib/file-data";
import type { ChatShareRouteContext } from "../chat-share-route-context";
import { parseChatShareGrantBody } from "../chat-share-route-model";

export async function handleChatShareGrantsPost(
  input: {
    request: Request;
  } & ChatShareRouteContext
) {
  const body = (await input.request.json().catch(() => ({}))) as {
    email?: unknown;
  };
  const parsedBody = parseChatShareGrantBody(body);

  if (!parsedBody.email) {
    void input.apiLogger.requestFailed(400, "Missing email", {
      slug: input.slug,
    });
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const grant = await grantResourceToUserByEmail({
    workspaceId: input.workspaceUuid,
    resourceType: "chat",
    resourceId: input.chat.slug,
    email: parsedBody.email,
    createdBy: input.user.id,
    permission: "viewer",
  });

  if (!grant) {
    void input.apiLogger.requestFailed(404, "User not found", {
      slug: input.slug,
    });
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  void input.apiLogger.meter("meter.share.created", {
    resourceType: "chat",
    slug: input.slug,
    workspaceUuid: input.workspaceUuid,
  });
  void input.apiLogger.featureUsed("chat.sharing.grant.created", {
    slug: input.slug,
  });
  void input.apiLogger.requestSucceeded(201, { slug: input.slug });

  return NextResponse.json({ grant }, { status: 201 });
}
