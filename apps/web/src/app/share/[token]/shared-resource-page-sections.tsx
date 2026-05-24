import type { Route } from "next";
import Link from "next/link";
import { MemoizedMarkdownSurface } from "@/components/chat/markdown-surface";
import { SharedResourceActions } from "@/components/files/shared-resource-actions";

interface SharedResourceSectionWorkspaces {
  name: string;
  organizationId: string;
  rootFolderId: string;
  workspaceId: string;
}

export function SharedResourceAccessDeniedPage({
  heading,
  resourceLabel,
}: {
  heading: string;
  resourceLabel: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-6 text-center">
      <h1 className="font-semibold text-2xl">{heading}</h1>
      <p className="mt-2 text-muted-foreground">
        You do not have access to this {resourceLabel}.
      </p>
    </main>
  );
}

export function SharedFileResourcePage({
  fileName,
  heading,
  storageUrl,
  token,
  workspaces,
}: {
  fileName: string;
  heading: string;
  storageUrl: string;
  token: string;
  workspaces: SharedResourceSectionWorkspaces[];
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-6 text-center">
      <h1 className="font-semibold text-2xl">{heading}</h1>
      <p className="mt-2 text-muted-foreground">{fileName}</p>
      <a
        className="mx-auto mt-6 inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm"
        href={storageUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        Open file
      </a>
      <SharedResourceActions
        resourceLabel="file"
        token={token}
        workspaces={workspaces}
      />
    </main>
  );
}

export function SharedMethodResourcePage({
  heading,
  messages,
  openWorkspaceHref,
}: {
  heading: string;
  messages: Array<{
    id: string;
    role: string;
    parts: Array<{ type: string; text?: string }>;
  }>;
  openWorkspaceHref: Route;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col p-6">
      <h1 className="mb-4 font-semibold text-2xl">{heading}</h1>
      <div className="space-y-3 rounded-lg border bg-card p-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No method messages yet.
          </p>
        ) : (
          messages.map((message) => {
            const textPart = message.parts.find(
              (part): part is { text: string; type: "text" } =>
                part.type === "text"
            );
            return (
              <div
                className="rounded-md border bg-background p-3"
                key={message.id}
              >
                <p className="mb-1 text-muted-foreground text-xs uppercase">
                  {message.role}
                </p>
                {textPart?.text ? (
                  <MemoizedMarkdownSurface
                    className="text-sm [&_p]:my-0"
                    content={textPart.text}
                    parseIncompleteMarkdown={false}
                    textSize="small"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm">
                    [non-text content]
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
      <Link
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm"
        href={openWorkspaceHref}
      >
        Open method in workspace
      </Link>
    </main>
  );
}

export function SharedFolderResourcePage({
  files,
  folderName,
  folders,
  heading,
  token,
  workspaces,
}: {
  files: Array<{ id: string; name: string; storageUrl: string }>;
  folderName: string;
  folders: Array<{ id: string; name: string }>;
  heading: string;
  token: string;
  workspaces: SharedResourceSectionWorkspaces[];
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col p-6">
      <h1 className="mb-2 font-semibold text-2xl">{heading}</h1>
      <p className="mb-4 text-muted-foreground text-sm">{folderName}</p>
      <div className="rounded-lg border bg-card p-4">
        <p className="font-medium text-sm">Folders</p>
        {folders.length === 0 ? (
          <p className="mt-1 text-muted-foreground text-sm">
            No subfolders yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {folders.map((entry) => (
              <li key={entry.id}>[Folder] {entry.name}</li>
            ))}
          </ul>
        )}
        <p className="mt-4 font-medium text-sm">Files</p>
        {files.length === 0 ? (
          <p className="mt-1 text-muted-foreground text-sm">No files yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {files.map((entry) => (
              <li key={entry.id}>
                <a
                  className="underline"
                  href={entry.storageUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {entry.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SharedResourceActions
        resourceLabel="folder"
        token={token}
        workspaces={workspaces}
      />
    </main>
  );
}
