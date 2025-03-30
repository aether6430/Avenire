import { UIMessage } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { Overview } from './overview';
import { memo, RefObject } from 'react';
import equal from 'fast-deep-equal';
import { UseChatHelpers } from '@ai-sdk/react';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers['status'];
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  error: UseChatHelpers['error'];
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  isReadonly: boolean;
  openCanvas: () => void
}

function PureMessages({
  chatId,
  status,
  messages,
  setMessages,
  error,
  reload,
  isReadonly,
  messagesContainerRef,
  messagesEndRef,
  openCanvas
}: MessagesProps) {

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 ml-4"
    >
      {messages.length === 0 && <Overview />}

      {messages.map((message, index) => (
        <PreviewMessage
          chatId={chatId}
          key={message.id}
          message={message}
          error={error}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          openCanvas={openCanvas}
        />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages.at(-1)?.role === 'user' && <ThinkingMessage />}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) { return false };
  if (prevProps.status && nextProps.status) { return false };
  if (prevProps.messages.length !== nextProps.messages.length) { return false };
  if (!equal(prevProps.messages, nextProps.messages)) { return false };

  return true;
});
