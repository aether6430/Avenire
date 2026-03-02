import { createFilesRealtimeSubscriber, hasFilesRealtimeConfigured } from "@/lib/files-realtime-publisher";
import { verifyFilesRealtimeToken } from "@/lib/files-realtime-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceUuid = url.searchParams.get("workspaceUuid")?.trim();
  const token = url.searchParams.get("token")?.trim();

  if (!workspaceUuid || !token) {
    return Response.json({ error: "Missing workspaceUuid or token" }, { status: 400 });
  }

  if (!hasFilesRealtimeConfigured()) {
    return Response.json({ error: "Realtime unavailable" }, { status: 503 });
  }

  const verification = verifyFilesRealtimeToken(token, workspaceUuid);
  if (!verification.ok) {
    return Response.json({ error: "Unauthorized", reason: verification.reason }, { status: 401 });
  }

  const { channel, subscriber } = await createFilesRealtimeSubscriber(workspaceUuid);
  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let streamClosed = false;

  const body = new ReadableStream<Uint8Array>({
    start: (controller) => {
      const write = (chunk: string) => {
        if (streamClosed) {
          return;
        }
        controller.enqueue(encoder.encode(chunk));
      };

      const disconnect = async () => {
        try {
          await subscriber.unsubscribe(channel);
        } catch {
          // ignore
        }

        try {
          await subscriber.quit();
        } catch {
          // ignore
        }
      };

      const closeStream = async () => {
        if (streamClosed) {
          return;
        }
        streamClosed = true;

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }

        await disconnect();

        try {
          controller.close();
        } catch {
          // Stream might already be closed by runtime.
        }
      };

      write("retry: 5000\n\n");

      heartbeatTimer = setInterval(() => {
        write(`: keepalive ${Date.now()}\n\n`);
      }, 20_000);

      void subscriber.subscribe(channel, (rawMessage) => {
        try {
          const payload = JSON.parse(rawMessage) as unknown;
          write("event: files.invalidate\n");
          write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch {
          // Ignore malformed messages.
        }
      });

      request.signal.addEventListener("abort", () => {
        void closeStream();
      });
    },
    cancel: async () => {
      if (streamClosed) {
        return;
      }
      streamClosed = true;

      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }

      try {
        await subscriber.unsubscribe(channel);
      } catch {
        // ignore
      }

      try {
        await subscriber.quit();
      } catch {
        // ignore
      }
    },
  });

  return new Response(body, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
