'use client';

import type { UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { toast } from 'sonner';
import { v4 as generateUUID } from "uuid"
import { SuggestedActions } from './suggested-actions';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { motion, useInView } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@avenire/ui/components/button';
import { Attachment } from './preview-attachment';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@avenire/ui/components/resizable"
import { useIsMobile } from '@avenire/ui/src/hooks/use-mobile';
import { Canvas } from './canvas';

export function Chat({
  id,
  initialMessages,
  selectedModel,
  isReadonly,
  selectedReasoningModel
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedModel: string;
  selectedReasoningModel: string;
  isReadonly: boolean;
}) {
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(false)
  const [deepResearchEnabled, setDeepResearchEnabled] = useState<boolean>(false)
  const { mutate } = useSWRConfig();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setData,
    setInput,
    append,
    status,
    stop,
    reload,
    error
  } = useChat({
    id,
    body: { chatId: id, selectedModel, selectedReasoningModel, currentPlots: [], thinkingEnabled, deepResearchEnabled },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate('/api/history');
    },
    onError: () => {
      toast.error('An error occured, please try again!');
    },
  });

  const [isCanvasOpen, setIsCanvasOpen] = useState(false)
  const isMobile = useIsMobile()
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [messagesContainerRef, messagesEndRef, scroll] =
    useScrollToBottom<HTMLDivElement>();
  const isInView = useInView(messagesEndRef)

  return (
    <ResizablePanelGroup direction="horizontal" className="w-[90%] mx-auto h-dvh">
      <ResizablePanel defaultSize={isCanvasOpen ? (isMobile ? 0 : 60) : 100}>
        <div className="flex flex-col min-w-0 h-full bg-background w-full">
          <Messages
            error={error}
            chatId={id}
            status={status}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            openCanvas={() => setIsCanvasOpen(true)}
            isReadonly={isReadonly}
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
          />
          {messages.length === 0 &&
            attachments.length === 0 &&
            <SuggestedActions append={append} chatId={id} />
          }


          <form className="sticky mx-auto b-0 flex flex-col md:max-w-3xl w-full items-center">
            <motion.div
              initial="hidden"
              animate={!isInView ? "visible" : "hidden"}
              variants={{
                "visible": { opacity: 100, visibility: "visible" },
                "hidden": { opacity: 0, visibility: "hidden" }
              }}
              className="absolute top-0 z-50 -translate-y-10"
              transition={{ duration: 0.5 }}
            >
              <Button variant="outline" className="rounded-full overflow-hidden" size="icon" type="button" onClick={scroll}>
                <ChevronDown />
              </Button>
            </motion.div>
            {!isReadonly && (
              <div className="p-4 pb-0 bg-border rounded-2xl rounded-b-none gap-2 w-full">
                <MultimodalInput
                  chatId={id}
                  input={input}
                  setInput={setInput}
                  reload={reload}
                  researchEnabled={deepResearchEnabled}
                  thinkingEnabled={thinkingEnabled}
                  toggleResearch={() => {
                    if (deepResearchEnabled) {
                      setDeepResearchEnabled(false)
                    } else {
                      setDeepResearchEnabled(true)
                      setThinkingEnabled(false)
                    }
                  }}
                  toggleThinking={() => {
                    if (thinkingEnabled) {
                      setThinkingEnabled(false)
                    } else {
                      setThinkingEnabled(true)
                      setDeepResearchEnabled(false)
                    }
                  }}
                  handleSubmit={handleSubmit}
                  setData={setData}
                  status={status}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  setMessages={setMessages}
                  append={append}
                />
              </div>
            )}
          </form>
        </div>
      </ResizablePanel>
      <CanvasPanel isCanvasOpen={isCanvasOpen} setIsCanvasOpen={setIsCanvasOpen} isMobile={isMobile} />
    </ResizablePanelGroup>
  );
}

function CanvasPanel({
  isCanvasOpen,
  setIsCanvasOpen,
  isMobile,
}: {
  isCanvasOpen: boolean;
  setIsCanvasOpen: (value: boolean) => void;
  isMobile: boolean;
}) {
  return (
    <>
      <ResizableHandle />
      <ResizablePanel
        defaultSize={isCanvasOpen ? (isMobile ? 100 : 40) : 0}
        minSize={isCanvasOpen ? (isMobile ? 100 : 40) : 0}
        maxSize={isCanvasOpen ? (isMobile ? 100 : 60) : 0}
      >
        <div className={`h-full w-full ${!isCanvasOpen ? "hidden" : ""}`}>
          <Canvas />
        </div>
      </ResizablePanel>
    </>
  );
}
