import { NextResponse } from "next/server";
import { listTrashedItems } from "@/lib/file-data";

export async function handleWorkspaceTrashRouteGet(input: {
  workspaceUuid: string;
}) {
  const items = await listTrashedItems(input.workspaceUuid);
  return NextResponse.json({ items });
}
