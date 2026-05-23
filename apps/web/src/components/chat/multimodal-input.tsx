"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "@avenire/ai/message-types";
import type { Dispatch, SetStateAction } from "react";
import { memo } from "react";
import type { Attachment } from "@/components/chat/attachment";
import { MultimodalInputSurface } from "@/components/chat/multimodal-input-surface";
import { useMultimodalInput } from "@/components/chat/use-multimodal-input";

function PureMultimodalInput({
  input,
  setInput,
  status,
  attachments,
  setAttachments,
  handleSubmit,
  stop,
  turboEnabled,
  onTurboChange,
  workspaceUuid,
  className,
  centered = false,
}: {
  input: string;
  setInput: (input: string) => void;
  status: UseChatHelpers<UIMessage>["status"];
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  handleSubmit: (
    inputValue: string,
    files: Attachment[]
  ) => void | Promise<void>;
  stop: () => void;
  turboEnabled: boolean;
  onTurboChange: (enabled: boolean) => void;
  workspaceUuid: string;
  className?: string;
  centered?: boolean;
}) {
  const runtime = useMultimodalInput({
    attachments,
    centered,
    className,
    handleSubmit,
    input,
    onTurboChange,
    setAttachments,
    setInput,
    status,
    stop,
    turboEnabled,
    workspaceUuid,
  });

  return <MultimodalInputSurface runtime={runtime} />;
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) =>
    prevProps.input === nextProps.input &&
    prevProps.status === nextProps.status &&
    prevProps.turboEnabled === nextProps.turboEnabled &&
    prevProps.attachments === nextProps.attachments &&
    prevProps.workspaceUuid === nextProps.workspaceUuid
);
