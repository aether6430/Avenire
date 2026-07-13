import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { describe, expect, it, vi } from "vitest";
import { createDurableChatSubscription } from "./durable-chat-subscription";

function createTransport(
  reconnectToStream: ChatTransport<UIMessage>["reconnectToStream"]
): ChatTransport<UIMessage> {
  return {
    reconnectToStream,
    sendMessages: vi.fn(),
  };
}

function reconnectOptions(chatId: string) {
  return { chatId };
}

describe("createDurableChatSubscription", () => {
  it("cancels a subscription when another chat becomes active", async () => {
    let cancelled = false;
    const upstream = new ReadableStream<UIMessageChunk>({
      cancel() {
        cancelled = true;
      },
    });
    const subscription = createDurableChatSubscription(
      createTransport(async () => upstream)
    );

    const stream = await subscription.transport.reconnectToStream(
      reconnectOptions("chat-a")
    );
    expect(stream).not.toBeNull();

    subscription.activate("chat-b");
    await vi.waitFor(() => expect(cancelled).toBe(true));
  });

  it("drops a reconnect response that resolves after navigation", async () => {
    let resolveReconnect:
      | ((stream: ReadableStream<UIMessageChunk>) => void)
      | null = null;
    let cancelled = false;
    const reconnect = new Promise<ReadableStream<UIMessageChunk>>((resolve) => {
      resolveReconnect = resolve;
    });
    const subscription = createDurableChatSubscription(
      createTransport(() => reconnect)
    );

    const pending = subscription.transport.reconnectToStream(
      reconnectOptions("chat-a")
    );
    subscription.activate("chat-b");
    const upstream = new ReadableStream<UIMessageChunk>({
      cancel() {
        cancelled = true;
      },
    });
    resolveReconnect?.(upstream);

    await expect(pending).resolves.toBeNull();
    await vi.waitFor(() => expect(cancelled).toBe(true));
  });

  it("drops a reconnect error that arrives after navigation", async () => {
    let rejectReconnect: ((error: Error) => void) | null = null;
    const reconnect = new Promise<ReadableStream<UIMessageChunk>>(
      (_resolve, reject) => {
        rejectReconnect = reject;
      }
    );
    const subscription = createDurableChatSubscription(
      createTransport(() => reconnect)
    );

    const pending = subscription.transport.reconnectToStream(
      reconnectOptions("chat-a")
    );
    subscription.activate("chat-b");
    rejectReconnect?.(new Error("old stream failed"));

    await expect(pending).resolves.toBeNull();
  });

  it("allows only one reconnect reader for a chat", async () => {
    const reconnectToStream = vi.fn(
      async () => new ReadableStream<UIMessageChunk>()
    );
    const subscription = createDurableChatSubscription(
      createTransport(reconnectToStream)
    );

    const first = await subscription.transport.reconnectToStream(
      reconnectOptions("chat-a")
    );
    const second = await subscription.transport.reconnectToStream(
      reconnectOptions("chat-a")
    );

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(reconnectToStream).toHaveBeenCalledTimes(1);
  });

  it("forwards tool progress as soon as each chunk arrives", async () => {
    let upstreamController: ReadableStreamDefaultController<UIMessageChunk> | null =
      null;
    const upstream = new ReadableStream<UIMessageChunk>({
      start(controller) {
        upstreamController = controller;
      },
    });
    const subscription = createDurableChatSubscription(
      createTransport(async () => upstream)
    );
    const stream = await subscription.transport.reconnectToStream(
      reconnectOptions("chat-a")
    );
    if (!stream) {
      throw new Error("Expected a reconnect stream");
    }
    const reader = stream.getReader();
    const toolStarted: UIMessageChunk = {
      type: "tool-input-start",
      toolCallId: "call-1",
      toolName: "search_materials",
    };
    const toolFinished: UIMessageChunk = {
      type: "tool-output-available",
      toolCallId: "call-1",
      output: { matches: 2 },
    };

    upstreamController?.enqueue(toolStarted);
    await expect(reader.read()).resolves.toEqual({
      done: false,
      value: toolStarted,
    });
    upstreamController?.enqueue(toolFinished);
    await expect(reader.read()).resolves.toEqual({
      done: false,
      value: toolFinished,
    });
  });
});
