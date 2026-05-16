import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceChatRoutePageClient } from "@/components/dashboard/workspace-chat-route-page-client";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { getChatBySlugForUser } from "@/lib/chat-data";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getRouteSession } from "@/lib/workspace-route-context";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const session = await getRouteSession();

  if (!session?.user || slug === "new") {
    return buildPageMetadata({
      noIndex: true,
      title: slug === "new" ? "New Method" : "Method",
    });
  }

  const chat = await getChatBySlugForUser(session.user.id, slug);

  return buildPageMetadata({
    noIndex: true,
    title: chat?.title ?? "Method",
  });
}

export default function WorkspaceChatSlugPage() {
  return (
    <Suspense
      fallback={<WorkspaceRoutePlaceholder label="Loading method..." />}
    >
      <WorkspaceChatRoutePageClient />
    </Suspense>
  );
}
