import { auth } from "@avenire/auth/server";
import { getMessagesByChatSlug } from "@avenire/database";
import type { Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  canUserAccessSharedResource,
  getFileAssetById,
  getFolderWithAncestors,
  listFolderContents,
  listWorkspacesForUser,
  resolveResourceShareLink,
} from "@/lib/file-data";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  getSharedResourceMissingPageTitle,
  getSharedResourcePageHeading,
  type SharedResourcePageResourceType,
} from "./shared-resource-page-model";
import {
  SharedFileResourcePage,
  SharedFolderResourcePage,
  SharedMethodResourcePage,
  SharedResourceAccessDeniedPage,
} from "./shared-resource-page-sections";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await resolveResourceShareLink(token);

  if (!link) {
    return buildPageMetadata({
      noIndex: true,
      title: getSharedResourceMissingPageTitle(),
    });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const hasAccess = await canUserAccessSharedResource({
    link,
    userId: session?.user?.id,
  });

  if (hasAccess && link.resourceType === "file") {
    const file = await getFileAssetById(link.workspaceId, link.resourceId);

    if (!file) {
      return buildPageMetadata({
        noIndex: true,
        title: getSharedResourceMissingPageTitle(),
      });
    }
  }

  if (hasAccess && link.resourceType === "folder") {
    const folder = await getFolderWithAncestors(
      link.workspaceId,
      link.resourceId
    );

    if (!folder?.folder) {
      return buildPageMetadata({
        noIndex: true,
        title: getSharedResourceMissingPageTitle(),
      });
    }
  }

  return buildPageMetadata({
    noIndex: true,
    title: getSharedResourcePageHeading({
      hasAccess,
      resourceType: link.resourceType as SharedResourcePageResourceType,
    }),
  });
}

export default async function SharedResourcePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await resolveResourceShareLink(token);

  if (!link) {
    notFound();
  }

  if (link.resourceType === "file") {
    const session = await auth.api.getSession({ headers: await headers() });
    const workspaces = session?.user?.id
      ? await listWorkspacesForUser(session.user.id)
      : [];
    const hasAccess = await canUserAccessSharedResource({
      link,
      userId: session?.user?.id,
    });
    if (!hasAccess) {
      if (!session?.user) {
        redirect(`/login?callbackURL=${encodeURIComponent(`/share/${token}`)}`);
      }
      return (
        <SharedResourceAccessDeniedPage
          heading={getSharedResourcePageHeading({
            hasAccess: false,
            resourceType: "file",
          })}
          resourceLabel="file"
        />
      );
    }

    const file = await getFileAssetById(link.workspaceId, link.resourceId);
    if (!file) {
      notFound();
    }

    return (
      <SharedFileResourcePage
        fileName={file.name}
        heading={getSharedResourcePageHeading({
          hasAccess: true,
          resourceType: "file",
        })}
        storageUrl={file.storageUrl}
        token={token}
        workspaces={workspaces}
      />
    );
  }

  if (link.resourceType === "chat") {
    const session = await auth.api.getSession({ headers: await headers() });
    const hasAccess = await canUserAccessSharedResource({
      link,
      userId: session?.user?.id,
    });

    if (!(hasAccess || session?.user)) {
      redirect(`/login?callbackURL=${encodeURIComponent(`/share/${token}`)}`);
    }

    if (!hasAccess) {
      return (
        <SharedResourceAccessDeniedPage
          heading={getSharedResourcePageHeading({
            hasAccess: false,
            resourceType: "chat",
          })}
          resourceLabel="method"
        />
      );
    }

    const messages = (await getMessagesByChatSlug(link.resourceId)) ?? [];

    return (
      <SharedMethodResourcePage
        heading={getSharedResourcePageHeading({
          hasAccess: true,
          resourceType: "chat",
        })}
        messages={messages}
        openWorkspaceHref={
          (session?.user
            ? `/workspace/chats/${link.resourceId}`
            : `/login?callbackURL=${encodeURIComponent(`/share/${token}`)}`) as Route
        }
      />
    );
  }

  if (link.resourceType === "folder") {
    const session = await auth.api.getSession({ headers: await headers() });
    const workspaces = session?.user?.id
      ? await listWorkspacesForUser(session.user.id)
      : [];
    const hasAccess = await canUserAccessSharedResource({
      link,
      userId: session?.user?.id,
    });

    if (!(hasAccess || session?.user)) {
      redirect(`/login?callbackURL=${encodeURIComponent(`/share/${token}`)}`);
    }

    if (!hasAccess) {
      return (
        <SharedResourceAccessDeniedPage
          heading={getSharedResourcePageHeading({
            hasAccess: false,
            resourceType: "folder",
          })}
          resourceLabel="folder"
        />
      );
    }

    const folder = await getFolderWithAncestors(
      link.workspaceId,
      link.resourceId
    );
    if (!folder?.folder) {
      notFound();
    }
    const children = await listFolderContents(
      link.workspaceId,
      link.resourceId
    );

    return (
      <SharedFolderResourcePage
        files={children.files}
        folderName={folder.folder.name}
        folders={children.folders}
        heading={getSharedResourcePageHeading({
          hasAccess: true,
          resourceType: "folder",
        })}
        token={token}
        workspaces={workspaces}
      />
    );
  }

  notFound();
}
