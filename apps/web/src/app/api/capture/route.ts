import { recomputeConceptMastery } from "@avenire/database";
import { createTaskForUser } from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import { createWorkspaceNoteFile } from "@/lib/file-data";
import { ensureNotesFolder } from "@/lib/quick-capture";
import { upsertMisconception } from "@/lib/learning-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { invalidateTaskListCache } from "@/lib/tasks-cache";
import { getWorkspaceContextForUser } from "@/lib/workspace";

type CaptureKind = "task" | "note" | "misconception";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    assigneeUserId?: unknown;
    confidence?: unknown;
    content?: unknown;
    description?: unknown;
    dueAt?: unknown;
    resources?: Array<{
      href: string;
      resourceId: string;
      resourceType: "file" | "folder" | "chat";
      subtitle: string | null;
      title: string;
    }>;
    kind?: unknown;
    concept?: unknown;
    reason?: unknown;
    subject?: unknown;
    title?: unknown;
    topic?: unknown;
  };

  const kind = normalizeText(body.kind) as CaptureKind;
  if (!kind || !["task", "note", "misconception"].includes(kind)) {
    return NextResponse.json({ error: "Invalid capture kind" }, { status: 400 });
  }

  if (kind === "task") {
    const title = normalizeText(body.title);
    if (!title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    try {
      const task = await createTaskForUser(
        ctx.user.id,
        ctx.workspace.workspaceId,
        {
          assigneeUserId:
            typeof body.assigneeUserId === "string" &&
            body.assigneeUserId.trim().length > 0
              ? body.assigneeUserId.trim()
              : ctx.user.id,
          description:
            typeof body.description === "string"
              ? body.description.trim() || null
              : null,
          dueAt:
            typeof body.dueAt === "string" && body.dueAt.trim().length > 0
              ? new Date(body.dueAt)
              : null,
          resources: Array.isArray(body.resources) ? body.resources : [],
          title,
        }
      );

      await invalidateTaskListCache(ctx.workspace.workspaceId, ctx.user.id);

      return NextResponse.json({ kind, task }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Unable to capture task.",
        },
        { status: 400 }
      );
    }
  }

  if (kind === "note") {
    const title = normalizeText(body.title);
    const content = normalizeText(body.content);
    if (!title) {
      return NextResponse.json({ error: "Note title is required" }, { status: 400 });
    }

    const notesFolder = await ensureNotesFolder({
      rootFolderId: ctx.workspace.rootFolderId,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });

    const note = await createWorkspaceNoteFile({
      content: content ? `# ${title}\n\n${content}\n` : `# ${title}\n`,
      folderId: notesFolder.id,
      metadata: { type: "note", quickCapture: true },
      name: title,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });

    await publishFilesInvalidationEvent({
      folderId: notesFolder.id,
      reason: "file.created",
      workspaceUuid: ctx.workspace.workspaceId,
    });
    await publishFilesInvalidationEvent({
      reason: "tree.changed",
      workspaceUuid: ctx.workspace.workspaceId,
    });

    return NextResponse.json({ kind, note }, { status: 201 });
  }

  const subject = normalizeText(body.subject);
  const topic = normalizeText(body.topic);
  const concept = normalizeText(body.concept);
  const reason = normalizeText(body.reason);
  const confidenceRaw =
    typeof body.confidence === "number" ? body.confidence : Number(body.confidence);
  const confidence =
    Number.isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1
      ? confidenceRaw
      : 0.85;

  if (!(subject && topic && concept && reason)) {
    return NextResponse.json(
      { error: "Subject, topic, concept, and reason are required" },
      { status: 400 }
    );
  }

  const misconception = await upsertMisconception({
    confidence,
    concept,
    reason,
    source: "manual",
    subject,
    topic,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  await recomputeConceptMastery({
    concept,
    reviewedAt: new Date(),
    subject,
    topic,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  return NextResponse.json({ kind, misconception }, { status: 201 });
}
