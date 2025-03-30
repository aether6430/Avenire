'use client';

import type { UIMessage } from 'ai';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useRef, useState } from 'react';
import { Check, SparklesIcon } from 'lucide-react';
import { Markdown } from './markdown';
import { PreviewAttachment } from './preview-attachment';
import equal from 'fast-deep-equal';
import { cn } from '@avenire/ui/utils';
import { MessageReasoning } from './message-reasoning';
import { useChat, UseChatHelpers } from '@ai-sdk/react';
import ResearchProcess from './deepresearch-process';
import ResearchDisplay from './deepresearch-display';
import dynamic from "next/dynamic"
import { Button } from '@avenire/ui/src/components/button';
import { LineChart } from "lucide-react"
import { useGraphStore } from '../../stores/graphStore';
import { MessageActions } from './chat-actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@avenire/ui/src/components/card';

const GraphImage = dynamic(
  () => import("./desmos").then((mod) => mod.GraphImage),
  {
    ssr: false,
  }
);

const PurePreviewMessage = ({
  chatId,
  message,
  isLoading,
  reload,
  isReadonly,
  error,
  openCanvas
}: {
  chatId: string,
  message: UIMessage;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  error: UseChatHelpers['error'];
  reload: UseChatHelpers['reload'];
  openCanvas: () => void
  isReadonly: boolean;
}) => {
  const { data: dataStream, messages } = useChat({
    id: chatId
  });
  const [researchData, setResearchData] = useState<Array<any>>([])
  const { addExpression } = useGraphStore()

  useEffect(() => {
    if (!dataStream?.length || (messages.at(-1)?.id !== message.id)) { return };
    setResearchData(dataStream)
  }, [dataStream])

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className={cn("w-full mx-auto max-w-3xl px-4 group/message", {
          'justify-self-end': message.role === "user"
        })}
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 flex-col w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          {error &&
            <Card className="bg-destructive text-destructive-foreground w-full">
              <CardHeader>
                <CardTitle>Oops, an error occured</CardTitle>
                <CardDescription>{error.name}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {error.message}
              </CardContent>
            </Card>
          }

          <div className={`flex flex-col gap-4 w-full ${message.role === "user" && "items-end"}`}>
            {message.experimental_attachments && (
              <div
                data-testid={"message-attachments"}
                className="flex flex-row justify-end gap-2"
              >
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.role === "assistant" && researchData.length > 0 &&
              <ResearchProcess data={researchData} />
            }
            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning') {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                );
              }

              if (type === 'text') {
                return (
                  <div key={key} className="flex flex-row gap-2 items-start">
                    <div
                      data-testid="message-content"
                      className={cn('flex flex-col gap-4', {
                        'bg-accent-foreground text-accent px-3 py-2 rounded-xl':
                          message.role === 'user',
                      })}
                    >
                      <Markdown content={part.text} id={key} />
                    </div>
                  </div>
                );
              }

              if (type === 'tool-invocation') {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === 'call') {
                  const { args } = toolInvocation;

                  switch (toolName) {
                    case "graphTool":
                      return (
                        <div key={key} className="flex flex-col items-start gap-2">
                          <GraphImage expressions={args.expressions} />
                          <Button variant="outline" size={"sm"} onClick={() => {
                            addExpression(args.expressions)
                            openCanvas()
                          }}><LineChart className="text-primary" /> Open in Canvas</Button>
                        </div>
                      )
                    default:
                      break
                  }
                }

                if (state === 'result') {
                  const { result, args } = toolInvocation;

                  switch (toolName) {
                    case "deepResearch":
                      if (researchData.length <= 0) {
                        return <ResearchDisplay data={result} />
                      }
                    case "graphTool":
                      return (
                        <div className="flex flex-col items-start gap-2">
                          <GraphImage expressions={args.expressions} />
                          <Button variant="outline" size={"sm"} onClick={() => {
                            addExpression(args.expressions)
                            openCanvas()
                          }}><LineChart className="text-primary" /> Open in Canvas</Button>
                        </div>
                      )
                    default:
                      break;
                  }
                }
              }
            })}

          </div>

          <MessageActions key={`action-${message.id}`} error={error !== undefined} isLoading={isLoading} message={message} reload={reload} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) { return false };
    if (prevProps.message.id !== nextProps.message.id) { return false };
    if (!equal(prevProps.message.parts, nextProps.message.parts)) { return false };

    return true;
  },
);

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cn(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
          {
            'group-data-[role=user]/message:bg-muted': true,
          },
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Hmm...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
