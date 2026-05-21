import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { WorkspaceFolderRoutePageClient } from "@/components/files/workspace-folder-route-page-client";
import {
  getAccessibleMarkdownNoteForUser,
  getFolderWithAncestors,
  listWorkspacesForUser,
} from "@/lib/file-data";
import { getMarkdownDisplayTitle } from "@/lib/markdown-title";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getWorkspaceRouteContext } from "@/lib/workspace-route-context";
import { resolveWorkspaceFilesPageTitle } from "../../../workspace-files-page-metadata";

export const dynamic = "force-dynamic";

function normalizeQueryValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry !== "string") {
        continue;
      }

      const trimmed = entry.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return null;
}

function stripMarkdownExtension(fileName: string) {
  const trimmed = fileName.trim();
  const withoutExtension = trimmed.replace(/\.mdx?$/i, "").trim();
  return withoutExtension.length > 0 ? withoutExtension : "Files";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ folderUuid: string; workspaceUuid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ folderUuid, workspaceUuid }, query, context] = await Promise.all([
    params,
    searchParams,
    getWorkspaceRouteContext(),
  ]);

  if (!context.session?.user) {
    return buildPageMetadata({
      noIndex: true,
      title: "Files",
    });
  }

  const workspaces = await listWorkspacesForUser(context.session.user.id);
  const requestedWorkspace =
    workspaces.find((workspace) => workspace.workspaceId === workspaceUuid) ??
    null;

  if (!requestedWorkspace) {
    return buildPageMetadata({
      noIndex: true,
      title: "Files",
    });
  }

  const fileId = normalizeQueryValue(query.file);
  if (fileId) {
    const accessibleNote = await getAccessibleMarkdownNoteForUser({
      fileId,
      userId: context.session.user.id,
    });

    if (accessibleNote?.workspaceId === workspaceUuid) {
      const fallbackTitle = stripMarkdownExtension(accessibleNote.file.name);
      return buildPageMetadata({
        noIndex: true,
        title:
          getMarkdownDisplayTitle(
            accessibleNote.note?.content ?? "",
            fallbackTitle
          ).trim() || fallbackTitle,
      });
    }
  }

  const folder = await getFolderWithAncestors(
    workspaceUuid,
    folderUuid,
    context.session.user.id
  );

  return buildPageMetadata({
    noIndex: true,
    title: resolveWorkspaceFilesPageTitle({
      folderName: folder?.folder?.name ?? null,
      isAtWorkspaceRoot: requestedWorkspace.rootFolderId === folderUuid,
      workspaceName: requestedWorkspace.name,
    }),
  });
}

export default async function WorkspaceFolderPage({
  params,
}: {
  params: Promise<{ folderUuid: string; workspaceUuid: string }>;
}) {
  const { folderUuid, workspaceUuid } = await params;

  return (
    <Suspense fallback={<WorkspaceRoutePlaceholder label="Loading files..." />}>
      <WorkspaceFolderRoutePageClient
        folderUuid={folderUuid}
        workspaceUuid={workspaceUuid}
      />
    </Suspense>
  );
}
