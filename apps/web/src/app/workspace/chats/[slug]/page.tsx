import { getChatBySlugForUser } from "@avenire/database";
import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceChatRoutePageClient } from "@/components/dashboard/workspace-chat-route-page-client";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getRouteSession } from "@/lib/workspace-route-context";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fallbackTitle = slug === "new" ? "New Method" : "Method";

  try {
    const session = await getRouteSession();

    if (!session?.user || slug === "new") {
      return buildPageMetadata({
        noIndex: true,
        title: fallbackTitle,
      });
    }

    const chat = await getChatBySlugForUser(session.user.id, slug);

    return buildPageMetadata({
      noIndex: true,
      title: chat?.title ?? "Method",
    });
  } catch {
    return buildPageMetadata({
      noIndex: true,
      title: fallbackTitle,
    });
  }
}

export default function WorkspaceChatSlugPage() {
  return (
    <Suspense
      fallback={<WorkspaceRoutePlaceholder label="Loading Method..." />}
    >
      <WorkspaceChatRoutePageClient />
    </Suspense>
  );
}
