import { getFileAssetById } from "@/lib/file-data";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { workspaceUuid, fileUuid } = await context.params;
  const canAccess = await ensureWorkspaceAccessForUser(user.id, workspaceUuid);
  if (!canAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = await getFileAssetById(workspaceUuid, fileUuid);
  if (!file?.storageUrl) {
    return new Response("File not found", { status: 404 });
  }

  return Response.redirect(file.storageUrl, 307);
}
