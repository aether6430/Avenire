import { notFound } from 'next/navigation';

import { Attachment, UIMessage } from '@avenire/ai';
import { getChatById, getMessagesByChatId } from '@avenire/database/queries';
import { Message } from '@avenire/database/schema';
import { Chat } from '../../../../components/chat/chat';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: '',
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  return (
    <>
      <Chat
        id={chat.id}
        selectedModel='fermion-core'
        selectedReasoningModel='fermion-reasoning'
        initialMessages={convertToUIMessages(messagesFromDb)}
        isReadonly={false}
      />
    </>
  );
}
