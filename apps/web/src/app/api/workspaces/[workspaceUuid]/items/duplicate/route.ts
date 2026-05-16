import { NextResponse } from "next/server";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import { handleDuplicateWorkspaceFile } from "./workspace-item-duplicate-file";
import { handleDuplicateWorkspaceFolder } from "./workspace-item-duplicate-folder";
import { workspaceItemDuplicateSchema } from "./workspace-item-duplicate-model";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await context.params;
  const canAccess = await ensureWorkspaceAccessForUser(user.id, workspaceUuid);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = workspaceItemDuplicateSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const body = parsed.data;
  if (body.kind === "file") {
    return await handleDuplicateWorkspaceFile({
      fileId: body.id,
      parentId: body.parentId,
      userId: user.id,
      workspaceUuid,
    });
  }

  return await handleDuplicateWorkspaceFolder({
    folderId: body.id,
    parentId: body.parentId,
    userId: user.id,
    workspaceUuid,
  });
}
