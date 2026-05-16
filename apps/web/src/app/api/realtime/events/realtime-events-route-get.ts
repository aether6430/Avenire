import { ensureWorkspaceAccessForUser } from "@/lib/workspace";
import {
  listWorkspaceStreamEvents,
  waitForWorkspaceStreamEvents,
} from "@/lib/workspace-event-stream";
import {
  buildRealtimeSseHeaders,
  resolveRealtimeEventsQuery,
  toRealtimeEventChunk,
  toRealtimeSseChunk,
} from "./realtime-events-route-model";

const encoder = new TextEncoder();

export async function handleRealtimeEventsRouteGet(input: {
  request: Request;
  userId: string;
}) {
  const query = resolveRealtimeEventsQuery(input.request);
  if (!query.workspaceUuid) {
    return new Response("Missing workspaceUuid", { status: 400 });
  }

  const canAccess = await ensureWorkspaceAccessForUser(
    input.userId,
    query.workspaceUuid
  );
  if (!canAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let cursor: string | null = query.cursor;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const write = (chunk: string) => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(chunk));
      };

      const writeEvent = (
        event: Awaited<ReturnType<typeof listWorkspaceStreamEvents>>[number]
      ) => {
        cursor = event.streamId;
        if (query.eventTypeFilter && event.type !== query.eventTypeFilter) {
          return;
        }

        write(
          toRealtimeEventChunk({
            event,
            workspaceUuid: query.workspaceUuid,
          })
        );
      };

      const close = () => {
        if (closed) {
          return;
        }
        closed = true;

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }

        try {
          controller.close();
        } catch {
          // no-op
        }
      };

      const run = async () => {
        write("retry: 5000\n\n");
        write(
          toRealtimeSseChunk({
            event: "ready",
            data: {
              cursor,
              workspaceUuid: query.workspaceUuid,
            },
          })
        );

        if (cursor) {
          const replay = await listWorkspaceStreamEvents({
            workspaceUuid: query.workspaceUuid,
            afterStreamId: cursor,
            limit: query.limit,
          });
          for (const event of replay) {
            writeEvent(event);
          }
        }

        while (!closed) {
          const events = await waitForWorkspaceStreamEvents({
            workspaceUuid: query.workspaceUuid,
            afterStreamId: cursor,
            limit: Math.min(query.limit, 100),
            blockMs: 15_000,
          });

          if (events.length === 0) {
            write(`: keepalive ${Date.now()}\n\n`);
            continue;
          }

          for (const event of events) {
            writeEvent(event);
          }
        }
      };

      heartbeatTimer = setInterval(() => {
        write(`: keepalive ${Date.now()}\n\n`);
      }, 20_000);

      void run().catch(() => close());
      input.request.signal.addEventListener("abort", close, { once: true });
    },
  });

  return new Response(stream, {
    headers: buildRealtimeSseHeaders(),
  });
}
