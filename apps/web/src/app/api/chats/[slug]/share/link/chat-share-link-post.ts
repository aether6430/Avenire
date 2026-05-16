import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import { createResourceShareLink } from "@/lib/file-data";
import type { ChatShareRouteContext } from "../chat-share-route-context";
import { buildChatShareUrl } from "../chat-share-route-model";

export async function handleChatShareLinkPost(
  input: {
    request: Request;
  } & ChatShareRouteContext
) {
  const link = await createResourceShareLink({
    workspaceId: input.workspaceUuid,
    resourceType: "chat",
    resourceId: input.chat.slug,
    createdBy: input.user.id,
    expiresInDays: 7,
    allowPublic: true,
  });

  const shareUrl = buildChatShareUrl(
    resolveAppBaseUrl(input.request),
    link.token
  );

  void input.apiLogger.meter("meter.share.created", {
    resourceType: "chat-link",
    slug: input.slug,
    workspaceUuid: input.workspaceUuid,
  });
  void input.apiLogger.featureUsed("chat.sharing.link.created", {
    slug: input.slug,
  });
  void input.apiLogger.requestSucceeded(200, { slug: input.slug });

  return NextResponse.json({
    link,
    shareUrl,
  });
}
