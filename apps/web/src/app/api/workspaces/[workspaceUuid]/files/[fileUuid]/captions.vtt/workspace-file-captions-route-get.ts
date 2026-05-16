import { listFileTranscriptCues } from "@/lib/ingestion-data";
import { resolveWorkspaceSupportRouteContext } from "../../../workspace-support-route-context";
import {
  buildWorkspaceCaptionsVtt,
  resolveWorkspaceSupportRouteError,
} from "../../../workspace-support-route-model";

export async function handleWorkspaceFileCaptionsRouteGet(input: {
  fileUuid: string;
  workspaceUuid: string;
}) {
  const context = await resolveWorkspaceSupportRouteContext({
    workspaceUuid: input.workspaceUuid,
  });
  if (!context.ok) {
    const failureBody = await context.response.json().catch(() => null);
    return new Response(failureBody?.error ?? "Forbidden", {
      status: context.response.status,
    });
  }

  try {
    const cues = await listFileTranscriptCues(
      context.workspaceUuid,
      input.fileUuid.trim()
    );
    return new Response(buildWorkspaceCaptionsVtt(cues), {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const failure = resolveWorkspaceSupportRouteError(error, {
      fallback: "Unable to load captions.",
    });
    return new Response("Unable to load captions.", {
      status: failure.status,
    });
  }
}
