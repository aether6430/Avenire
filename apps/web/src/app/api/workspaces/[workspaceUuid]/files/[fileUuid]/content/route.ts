import { Cause, Effect, Exit, Result } from "effect-v4";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import {
  requireWorkspaceAuthorization,
  WorkspaceServicesLive,
} from "@/lib/effect-services/workspace";
import {
  resolveWorkspaceFileContentRouteError,
  WORKSPACE_FILE_CONTENT_ERROR,
  workspaceFileContentPatchSchema,
} from "./workspace-file-content-route-model";
import { handleWorkspaceFileContentPatch } from "./workspace-file-content-route-patch";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  try {
    const { workspaceUuid, fileUuid } = await context.params;
    const authorization = await Effect.runPromiseExit(
      requireWorkspaceAuthorization(workspaceUuid).pipe(
        Effect.provide(WorkspaceServicesLive)
      ),
      { signal: request.signal }
    );
    if (Exit.isFailure(authorization)) {
      const failure = Cause.findError(authorization.cause);
      if (Result.isSuccess(failure)) {
        switch (failure.success._tag) {
          case "AuthenticationRequired":
            return NextResponse.json(
              { error: "Unauthorized" },
              { status: 401 }
            );
          case "WorkspaceAccessDenied":
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          case "AuthenticationLookupFailed":
          case "WorkspaceAccessLookupFailed":
            return NextResponse.json(
              { error: WORKSPACE_FILE_CONTENT_ERROR },
              { status: 500 }
            );
        }
      }
      return NextResponse.json(
        { error: WORKSPACE_FILE_CONTENT_ERROR },
        { status: 500 }
      );
    }

    const parsed = await parseJsonRequest(
      request,
      workspaceFileContentPatchSchema
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    return await handleWorkspaceFileContentPatch({
      body: parsed.data,
      fileUuid,
      userId: authorization.value.id,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileContentRouteError(
          error,
          WORKSPACE_FILE_CONTENT_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
