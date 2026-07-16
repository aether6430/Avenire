import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

export interface DurableChatSubscription<
  Message extends UIMessage = UIMessage,
> {
  activate: (chatId: string) => void;
  dispose: () => void;
  transport: ChatTransport<Message>;
}

function cancelReader(
  reader: ReadableStreamDefaultReader<UIMessageChunk> | null
) {
  if (!reader) {
    return;
  }
  void reader.cancel().catch(() => undefined);
}

export function createDurableChatSubscription<
  Message extends UIMessage = UIMessage,
>(baseTransport: ChatTransport<Message>): DurableChatSubscription<Message> {
  let activeChatId: string | null = null;
  let activeReader: ReadableStreamDefaultReader<UIMessageChunk> | null = null;
  let generation = 0;
  let reconnecting = false;

  const activate = (chatId: string) => {
    if (activeChatId === chatId) {
      return;
    }

    generation += 1;
    activeChatId = chatId;
    reconnecting = false;
    const previousReader = activeReader;
    activeReader = null;
    cancelReader(previousReader);
  };

  const reconnectToStream: ChatTransport<Message>["reconnectToStream"] = async (
    options
  ) => {
    activate(options.chatId);
    if (reconnecting || activeReader) {
      return null;
    }

    const requestedGeneration = generation;
    reconnecting = true;
    let stream: ReadableStream<UIMessageChunk> | null;
    try {
      stream = await baseTransport.reconnectToStream(options);
    } catch (error) {
      if (
        requestedGeneration !== generation ||
        activeChatId !== options.chatId
      ) {
        return null;
      }
      throw error;
    } finally {
      if (requestedGeneration === generation) {
        reconnecting = false;
      }
    }

    if (!stream) {
      return null;
    }

    const reader = stream.getReader();
    if (requestedGeneration !== generation || activeChatId !== options.chatId) {
      cancelReader(reader);
      return null;
    }

    activeReader = reader;
    return new ReadableStream<UIMessageChunk>({
      async cancel(reason) {
        if (activeReader === reader) {
          activeReader = null;
        }
        await reader.cancel(reason);
      },
      async pull(controller) {
        try {
          const result = await reader.read();
          if (
            requestedGeneration !== generation ||
            activeChatId !== options.chatId
          ) {
            controller.close();
            cancelReader(reader);
            return;
          }
          if (result.done) {
            if (activeReader === reader) {
              activeReader = null;
            }
            controller.close();
            return;
          }
          controller.enqueue(result.value);
        } catch (error) {
          if (
            requestedGeneration !== generation ||
            activeChatId !== options.chatId
          ) {
            controller.close();
            return;
          }
          controller.error(error);
        }
      },
    });
  };

  return {
    activate,
    dispose: () => {
      generation += 1;
      activeChatId = null;
      reconnecting = false;
      const previousReader = activeReader;
      activeReader = null;
      cancelReader(previousReader);
    },
    transport: {
      reconnectToStream,
      sendMessages: (options) => {
        activate(options.chatId);
        return baseTransport.sendMessages(options);
      },
    },
  };
}
