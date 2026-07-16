// @vitest-environment node

import {
  createDurableChatTransport,
  toDurableStreamResponse,
} from "@durable-streams/aisdk-transport";
import { DurableStreamTestServer } from "@durable-streams/server";
import type { UIMessageChunk } from "ai";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDurableChatSubscription } from "./durable-chat-subscription";

interface ControlledSource {
  close: () => void;
  enqueue: (chunk: UIMessageChunk) => void;
  stream: ReadableStream<UIMessageChunk>;
}

function createControlledSource(): ControlledSource {
  let controller: ReadableStreamDefaultController<UIMessageChunk> | null = null;
  const stream = new ReadableStream<UIMessageChunk>({
    start(nextController) {
      controller = nextController;
    },
  });

  return {
    close: () => {
      if (!controller) {
        throw new Error("Controlled durable stream source is not ready");
      }
      controller.close();
    },
    enqueue: (chunk) => {
      if (!controller) {
        throw new Error("Controlled durable stream source is not ready");
      }
      controller.enqueue(chunk);
    },
    stream,
  };
}

async function* asAsyncIterable(stream: ReadableStream<UIMessageChunk>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        return;
      }
      yield result.value;
    }
  } finally {
    reader.releaseLock();
  }
}

async function readNext(
  reader: ReadableStreamDefaultReader<UIMessageChunk>,
  timeoutMs = 2000
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Timed out waiting for durable stream chunk")),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function readAll(stream: ReadableStream<UIMessageChunk>) {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  while (true) {
    const result = await readNext(reader);
    if (result.done) {
      return chunks;
    }
    chunks.push(result.value);
  }
}

describe("durable chat real server boundary", () => {
  const server = new DurableStreamTestServer({
    longPollTimeout: 250,
    port: 0,
  });
  const streamUrls = new Map<string, string>();
  const backgroundTasks: Promise<unknown>[] = [];
  let serverUrl = "";
  let serverStarted = false;

  beforeAll(async () => {
    serverUrl = await server.start();
    serverStarted = true;
  });

  afterAll(async () => {
    await Promise.allSettled(backgroundTasks);
    if (serverStarted) {
      await server.stop();
    }
  });

  const publish = async (chatId: string, source: ControlledSource) => {
    const streamUrl = `${serverUrl}/chat/${chatId}`;
    streamUrls.set(chatId, streamUrl);
    await toDurableStreamResponse({
      source: asAsyncIterable(source.stream),
      stream: { readUrl: streamUrl, writeUrl: streamUrl },
      waitUntil: (task) => {
        backgroundTasks.push(task);
      },
    });
  };

  const fetchClient: typeof fetch = async (input) => {
    const requestUrl = new URL(
      input instanceof Request ? input.url : input.toString()
    );
    const match = requestUrl.pathname.match(/^\/api\/chat\/([^/]+)\/stream$/);
    const chatId = match?.[1] ? decodeURIComponent(match[1]) : null;
    const streamUrl = chatId ? streamUrls.get(chatId) : null;
    if (!streamUrl) {
      return new Response(null, { status: 204 });
    }

    return Response.json(
      { streamUrl },
      { headers: { Location: streamUrl }, status: 200 }
    );
  };

  it("switches chats and replays the missed tool-call tail on reconnect", async () => {
    const chatA = createControlledSource();
    const chatB = createControlledSource();
    await publish("chat-a", chatA);
    await publish("chat-b", chatB);

    const baseTransport = createDurableChatTransport({
      api: "http://avenire.local/api/chat",
      fetchClient,
    });
    const subscription = createDurableChatSubscription(baseTransport);
    const firstToolChunk: UIMessageChunk = {
      type: "tool-input-start",
      toolCallId: "call-1",
      toolName: "search_materials",
    };
    const toolResultChunk: UIMessageChunk = {
      type: "tool-output-available",
      toolCallId: "call-1",
      output: { matches: 2 },
    };
    const chatBChunk: UIMessageChunk = {
      type: "data-agent_activity",
      data: { label: "Working in chat B" },
    };

    const firstStream = await subscription.transport.reconnectToStream({
      chatId: "chat-a",
    });
    if (!firstStream) {
      throw new Error("Expected chat A durable stream");
    }
    const firstReader = firstStream.getReader();
    chatA.enqueue(firstToolChunk);
    await expect(readNext(firstReader)).resolves.toEqual({
      done: false,
      value: firstToolChunk,
    });

    chatB.enqueue(chatBChunk);
    chatB.close();
    const secondStream = await subscription.transport.reconnectToStream({
      chatId: "chat-b",
    });
    if (!secondStream) {
      throw new Error("Expected chat B durable stream");
    }
    await expect(readAll(secondStream)).resolves.toEqual([chatBChunk]);

    chatA.enqueue(toolResultChunk);
    chatA.close();
    await Promise.allSettled(backgroundTasks);

    const catchUpStream = await subscription.transport.reconnectToStream({
      chatId: "chat-a",
    });
    if (!catchUpStream) {
      throw new Error("Expected chat A catch-up stream");
    }
    await expect(readAll(catchUpStream)).resolves.toEqual([
      firstToolChunk,
      toolResultChunk,
    ]);

    subscription.dispose();
  }, 15_000);
});
