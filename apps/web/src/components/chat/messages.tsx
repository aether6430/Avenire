"use client";

import { memo } from "react";
import { areMessagesPropsEqual, type MessagesProps } from "./messages-model";
import { ChatMessagesSurface } from "./messages-surface";
import { useChatMessages } from "./use-chat-messages";

function PureMessages(props: MessagesProps) {
  const runtime = useChatMessages(props);

  return <ChatMessagesSurface props={props} runtime={runtime} />;
}

export const Messages = memo(PureMessages, areMessagesPropsEqual);
