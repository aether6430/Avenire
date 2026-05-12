import { auth } from "@avenire/auth/server";
import { getStorageUrl } from "@avenire/storage";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { listWorkspaceFiles, resolveWorkspaceForUser } from "@/lib/file-data";

interface UploadThingServerFile {
  contentType?: string;
  key: string;
  name: string;
  size: number;
  uploadedAt: number;
  url: string;
}

function inferContentType(name: string): string | undefined {
  const extension = name.split(".").pop()?.toLowerCase();

  if (!extension) {
    return undefined;
  }

  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return `image/${extension === "jpg" ? "jpeg" : extension}`;
  }

  if (extension === "pdf") {
    return "application/pdf";
  }

  if (["txt", "md"].includes(extension)) {
    return "text/plain";
  }

  return undefined;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ files: [] }, { status: 401 });
  }

  if (!process.env.UPLOADTHING_TOKEN) {
    return NextResponse.json({ files: [] });
  }

  try {
    const activeOrganizationId =
      (session as { session?: { activeOrganizationId?: string | null } })
        .session?.activeOrganizationId ?? null;
    const workspace = await resolveWorkspaceForUser(
      session.user.id,
      activeOrganizationId
    );
    if (!workspace) {
      return NextResponse.json({ files: [] }, { status: 404 });
    }

    const dbFiles = await listWorkspaceFiles(workspace.workspaceId);
    const files: UploadThingServerFile[] = dbFiles.map((file) => ({
      key: file.storageKey,
      name: file.name,
      size: file.sizeBytes,
      uploadedAt: Date.parse(file.createdAt),
      url: "",
      contentType: file.mimeType ?? inferContentType(file.name),
    }));

    if (files.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const hydrated = await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await getStorageUrl(file.key).catch(() => ""),
      }))
    );
    const visible = hydrated
      .filter((file) => file.url.length > 0)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    return NextResponse.json({ files: visible });
  } catch {
    return NextResponse.json({ files: [] }, { status: 500 });
  }
}
