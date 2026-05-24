import { listIngestionEventsForWorkspace } from "@avenire/database";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import {
  hasWorkspaceEventStreamConfigured,
  listWorkspaceStreamEvents,
  waitForWorkspaceStreamEvents,
} from "@/lib/workspace-event-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const INGESTION_JOB_EVENTS_LOAD_ERROR = "Unable to load ingestion job events.";
const encoder = new TextEncoder();

function resolveIngestionJobEventsQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawWorkspaceUuid = searchParams.get("workspaceUuid");
  const rawCursor = searchParams.get("cursor");

  return {
    cursor: rawCursor?.trim() || null,
    workspaceUuid: rawWorkspaceUuid?.trim() || null,
  };
}

function toIngestionJobReadyChunk(input: {
  cursor?: string | null;
  mode?: "workspace-stream";
}) {
  const payload =
    input.cursor || input.mode
      ? JSON.stringify({
          ...(input.cursor ? { cursor: input.cursor } : {}),
          ...(input.mode ? { mode: input.mode } : {}),
        })
      : "{}";

  return `event: ready\ndata: ${payload}\n\n`;
}

function toIngestionJobEventChunk(input: {
  payload: Record<string, unknown>;
  streamId?: string;
}) {
  const encodedPayload = JSON.stringify(
    input.streamId
      ? {
          ...input.payload,
          version: input.streamId,
        }
      : input.payload
  );

  return `${input.streamId ? `id: ${input.streamId}\n` : ""}event: ingestion.job\ndata: ${encodedPayload}\n\n`;
}

function buildIngestionJobEventsHeaders() {
  return {
    "cache-control": "no-store",
    connection: "keep-alive",
    "content-type": "text/event-stream; charset=utf-8",
  };
}

function resolveIngestionJobEventsRouteError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const sleep = async (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const query = resolveIngestionJobEventsQuery(request);
    if (!query.workspaceUuid) {
      return new Response("Missing workspaceUuid", { status: 400 });
    }
    const workspaceUuid = query.workspaceUuid;

    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
    if (!canAccess) {
      return new Response("Forbidden", { status: 403 });
    }

    if (hasWorkspaceEventStreamConfigured()) {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          let cancelled = false;
          let cursor = query.cursor;

          const write = (chunk: string) => {
            if (cancelled) {
              return;
            }
            controller.enqueue(encoder.encode(chunk));
          };

          const close = () => {
            cancelled = true;
            try {
              controller.close();
            } catch {
              // no-op
            }
          };

          const run = async () => {
            write("retry: 5000\n\n");
            write(
              toIngestionJobReadyChunk({
                cursor,
                mode: "workspace-stream",
              })
            );

            if (cursor) {
              const replay = await listWorkspaceStreamEvents({
                workspaceUuid,
                afterStreamId: cursor,
                limit: 200,
              });
              for (const event of replay) {
                cursor = event.streamId;
                if (event.type !== "ingestion.job") {
                  continue;
                }
                write(
                  toIngestionJobEventChunk({
                    payload: event.payload,
                    streamId: event.streamId,
                  })
                );
              }
            }

            while (!cancelled) {
              const events = await waitForWorkspaceStreamEvents({
                workspaceUuid,
                afterStreamId: cursor,
                limit: 100,
                blockMs: 15_000,
              });
              if (events.length === 0) {
                write(`: keepalive ${Date.now()}\n\n`);
                continue;
              }

              for (const event of events) {
                cursor = event.streamId;
                if (event.type !== "ingestion.job") {
                  continue;
                }
                write(
                  toIngestionJobEventChunk({
                    payload: event.payload,
                    streamId: event.streamId,
                  })
                );
              }
            }
          };

          void run().catch(() => close());
          request.signal.addEventListener("abort", close, { once: true });
        },
      });

      return new Response(stream, {
        headers: buildIngestionJobEventsHeaders(),
      });
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let cancelled = false;

        const write = (chunk: string) => {
          if (cancelled) {
            return;
          }
          controller.enqueue(encoder.encode(chunk));
        };

        const close = () => {
          cancelled = true;
          try {
            controller.close();
          } catch {
            // no-op
          }
        };

        const run = async () => {
          let cursor = new Date(Date.now() - 60_000).toISOString();

          write(
            toIngestionJobReadyChunk({
              cursor: null,
            })
          );

          while (!cancelled) {
            const events = await listIngestionEventsForWorkspace({
              workspaceId: workspaceUuid,
              sinceIso: cursor,
              limit: 200,
            });

            for (const event of events) {
              cursor = event.createdAt;
              write(
                toIngestionJobEventChunk({
                  payload: event as Record<string, unknown>,
                })
              );
            }

            write("event: ping\ndata: {}\n\n");
            await sleep(1500);
          }
        };

        void run().catch(() => close());
        request.signal.addEventListener("abort", close, { once: true });
      },
    });

    return new Response(stream, {
      headers: buildIngestionJobEventsHeaders(),
    });
  } catch (error) {
    return new Response(
      resolveIngestionJobEventsRouteError(
        error,
        INGESTION_JOB_EVENTS_LOAD_ERROR
      ),
      { status: 500 }
    );
  }
}
