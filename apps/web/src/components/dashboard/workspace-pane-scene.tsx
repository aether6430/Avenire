"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { WorkspaceOverviewPageClient } from "@/components/dashboard/workspace-overview-page-client";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";

const WorkspaceTasksPageClient = dynamic(
  () =>
    import("@/components/tasks/workspace-tasks-page-client").then(
      (module) => module.WorkspaceTasksPageClient
    ),
  {
    loading: () => <WorkspaceRoutePlaceholder label="Loading tasks..." />,
    ssr: false,
  }
);

const WorkspaceFlashcardsPageClient = dynamic(
  () =>
    import("@/components/flashcards/workspace-flashcards-page-client").then(
      (module) => module.WorkspaceFlashcardsPageClient
    ),
  {
    loading: () => (
      <WorkspaceRoutePlaceholder label="Loading Mindset Sets..." />
    ),
    ssr: false,
  }
);

const WorkspaceFilesRootPageClient = dynamic(
  () =>
    import("@/components/files/workspace-files-root-page-client").then(
      (module) => module.WorkspaceFilesRootPageClient
    ),
  {
    loading: () => <WorkspaceRoutePlaceholder label="Loading files..." />,
    ssr: false,
  }
);

const WorkspaceChatNewPageClient = dynamic(
  () =>
    import("@/components/dashboard/workspace-chat-new-page-client").then(
      (module) => module.WorkspaceChatNewPageClient
    ),
  {
    loading: () => <WorkspaceRoutePlaceholder label="Loading Method..." />,
    ssr: false,
  }
);

const WorkspaceChatRoutePageClient = dynamic(
  () =>
    import("@/components/dashboard/workspace-chat-route-page-client").then(
      (module) => module.WorkspaceChatRoutePageClient
    ),
  {
    loading: () => <WorkspaceRoutePlaceholder label="Loading Method..." />,
    ssr: false,
  }
);

const WorkspaceFolderRoutePageClient = dynamic(
  () =>
    import("@/components/files/workspace-folder-route-page-client").then(
      (module) => module.WorkspaceFolderRoutePageClient
    ),
  {
    loading: () => <WorkspaceRoutePlaceholder label="Loading files..." />,
    ssr: false,
  }
);

const FlashcardSetPageClient = dynamic(
  () =>
    import("@/components/flashcards/set-detail-page").then(
      (module) => module.FlashcardSetPageClient
    ),
  {
    loading: () => <WorkspaceRoutePlaceholder label="Loading Mindset Set..." />,
    ssr: false,
  }
);

export function WorkspacePaneScene({
  paneId,
  pathname,
  search,
}: {
  paneId: string;
  pathname: string;
  search: string;
}) {
  const searchParams = useMemo(
    () =>
      new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
    [search]
  );

  if (pathname === "/workspace") {
    return <WorkspaceOverviewPageClient />;
  }

  if (pathname === "/workspace/tasks") {
    return <WorkspaceTasksPageClient />;
  }

  if (pathname === "/workspace/flashcards") {
    return <WorkspaceFlashcardsPageClient />;
  }

  const filesRootMatch = pathname.match(/^\/workspace\/files(?:\/([^/?#]+))?$/);
  if (pathname === "/workspace/files" || filesRootMatch?.[1]) {
    return (
      <WorkspaceFilesRootPageClient
        preferredWorkspaceUuid={filesRootMatch?.[1] ?? undefined}
      />
    );
  }

  if (pathname === "/workspace/chats/new") {
    return <WorkspaceChatNewPageClient allowPrompt />;
  }

  const chatMatch = pathname.match(/^\/workspace\/chats\/([^/?#]+)$/);
  if (pathname === "/workspace/chats" || chatMatch) {
    return <WorkspaceChatRoutePageClient slug={chatMatch?.[1] ?? undefined} />;
  }

  const fileMatch = pathname.match(
    /^\/workspace\/files\/([^/]+)\/folder\/([^/?#]+)$/
  );
  if (fileMatch?.[1] && fileMatch?.[2]) {
    return (
      <WorkspaceFolderRoutePageClient
        folderUuid={fileMatch[2]}
        workspaceUuid={fileMatch[1]}
      />
    );
  }

  const flashcardSetMatch = pathname.match(
    /^\/workspace\/flashcards\/([^/?#]+)$/
  );
  if (flashcardSetMatch?.[1]) {
    return (
      <FlashcardSetPageClient
        autoStudy={searchParams.get("study") === "1"}
        drillFilters={searchParams.getAll("drill")}
        setId={flashcardSetMatch[1]}
      />
    );
  }

  return (
    <WorkspaceRoutePlaceholder
      label="This workspace view isn't available."
      pending={false}
    />
  );
}
