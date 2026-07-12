import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { parseJsonRequest, unknownJsonRequestSchema } from "@/lib/api-request";
import {
  resolveWorkspaceFileRegisterBulkRouteError,
  WORKSPACE_FILE_REGISTER_BULK_ERROR,
  workspaceFileRegisterBulkRequestSchema,
} from "./workspace-file-register-bulk-model";
import { postWorkspaceFileRegisterBulk } from "./workspace-file-register-bulk-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;

    const requestBody = await parseJsonRequest(request, unknownJsonRequestSchema);
    if (!requestBody.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const parsed = workspaceFileRegisterBulkRequestSchema.safeParse(requestBody.data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    return await postWorkspaceFileRegisterBulk({
      body: parsed.data,
      userId: user.id,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileRegisterBulkRouteError(
          error,
          WORKSPACE_FILE_REGISTER_BULK_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
