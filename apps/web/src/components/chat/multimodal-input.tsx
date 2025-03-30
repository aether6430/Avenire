'use client';

import type { Message, UIMessage } from 'ai';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { ArrowUpIcon, Brain, Globe, Italic, PaperclipIcon, RotateCcw, Square } from 'lucide-react';
import { PreviewAttachment, Attachment } from './preview-attachment';
import { Button } from '@avenire/ui/components/button';
import { Textarea } from '@avenire/ui/components/textarea';
import equal from 'fast-deep-equal';
import { UseChatHelpers } from '@ai-sdk/react';
import { cn } from '@avenire/ui/utils';
import { useUploadThing } from '../../lib/uploadClient';
import { v4 as uuid } from "uuid"
import { deleteFile } from '../../actions/actions';
import { AnimatePresence, motion } from 'motion/react';
import { Toggle } from "@avenire/ui/components/toggle"

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  setData,
  researchEnabled,
  thinkingEnabled,
  toggleResearch,
  messages,
  reload,
  toggleThinking,
  setMessages,
  handleSubmit,
  className,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  setData: UseChatHelpers['setData'];
  status: UseChatHelpers['status'];
  researchEnabled: boolean;
  thinkingEnabled: boolean;
  stop: () => void;
  toggleThinking: () => void;
  toggleResearch: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  reload: UseChatHelpers['reload'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const { startUpload } = useUploadThing("chatAttachments");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    const newAttachments: Attachment[] = files.map((file) => {
      const id = uuid();
      const abortController = new AbortController();

      return {
        id,
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        contentType: file.type,
        status: "pending",
        abortController,
      };
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    uploadFiles(newAttachments);
  };

  const uploadFiles = async (files: Attachment[]) => {
    for (const attachment of files) {
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === attachment.id ? { ...a, status: "uploading" } : a
        )
      );

      try {
        if (attachment.abortController?.signal.aborted) {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachment.id ? { ...a, status: "failed" } : a
            )
          );
          continue; // Skip to the next file
        }
        // Upload the file
        const response = await startUpload([attachment.file]);

        if (response) {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachment.id
                ? {
                  ...a,
                  status: "completed",
                  url: response[0].ufsUrl,
                }
                : a
            )
          );
        }
      } catch (error) {
        toast("Error happened")
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id ? { ...a, status: "failed" } : a
          )
        );
      }
    }
  };

  const removeAttachment = ({ status, id, url }: { status: "uploading" | "pending" | "failed", id: string, url: undefined } | { status: "completed", id: undefined, url: string }): void => {
    setAttachments((prev) => {

      if ((status === "uploading" || status === "pending")) {
        const target = prev.find((a) => a.id === id);
        if (target?.abortController) { target.abortController.abort() };
      }

      if (status === "completed") {
        const deleteTarget = async () => {
          try {
            const { error, success } = await deleteFile(url);
            if (!success) {
              toast.error("Error deleting file.");
            }
          } catch (error) {
            toast.error("Failed to delete file.");
          }
        };

        deleteTarget(); // Trigger the async delete process
      }

      return prev.filter((a) => (a.id !== id && a.url !== url));
    });
  };


  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });

    setAttachments([]);
    setData([])
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  return (
    <div className="relative w-full flex flex-col bg-muted gap-4 rounded-2xl rounded-b-none overflow-hidden">
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />


      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-2 p-3 pb-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {attachments.map((attachment) => (
              <PreviewAttachment
                key={attachment.id}
                attachment={attachment}
                onRemove={removeAttachment}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>


      <div className="flex flex-col items-start">
        <div className="flex flex-row gap-4 bg-muted rounded-2xl rounded-b-none w-full items-start">
          <Textarea
            data-testid="multimodal-input"
            ref={textareaRef}
            placeholder="Send a message..."
            value={input}
            onChange={handleInput}
            className={cn(
              'min-h-[24px] max-h-[calc(30dvh)] [&::-webkit-scrollbar-thumb]:bg-background overflow-visible resize-none bg-muted pb-10 border',
              className,
            )}
            rows={2}
            autoFocus
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();

                if (status !== 'ready') {
                  toast.error('Please wait for the model to finish its response!');
                } else {
                  submitForm();
                }
              }
            }}
          />
          <div className="flex flex-row p-2 gap-2">
            <div className="w-fit flex flex-row justify-start">
              <AttachmentsButton fileInputRef={fileInputRef} status={status} />
            </div>

            <div className="w-fit flex flex-row justify-end">
              {(status === 'error' || (messages.at(-1)?.role === "user" && status === 'submitted')) ? <ReloadButton reload={reload} /> :
                status === 'submitted' ? (
                  <StopButton stop={stop} setMessages={setMessages} />
                ) : (
                  <SendButton
                    input={input}
                    submitForm={submitForm}
                    uploadQueue={uploadQueue}
                  />
                )
              }
            </div>
          </div>
        </div>
        <div className="flex flex-row gap-2 p-2">
          <Toggle size={"sm"} aria-label="Toggle Thinking" disabled={researchEnabled} onClick={() => {
            toggleThinking()
          }}>
            <Brain />
            Thinking
          </Toggle>
          <Toggle size={"sm"} aria-label="Toggle Deep Research" disabled={thinkingEnabled} onClick={() => {
            toggleResearch()
          }}>
            <Globe />
            Deep Research
          </Toggle>
        </div>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) { return false };
    if (prevProps.status !== nextProps.status) { return false };
    if (!equal(prevProps.attachments, nextProps.attachments)) { return false };

    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      size={"icon"}
      disabled={status !== 'ready'}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureReloadButton({
  reload,
}: {
  reload: UseChatHelpers['reload'];
}) {
  return (
    <Button
      data-testid="reload-button"
      size={"icon"}
      variant={"ghost"}
      onClick={(event) => {
        event.preventDefault();
        reload()
      }}
    >
      <RotateCcw size={14} />
    </Button>
  );
}

const ReloadButton = memo(PureReloadButton);


function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      size={"icon"}
      variant={"ghost"}
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <Square size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      data-testid="send-button"
      size={"icon"}
      variant={"ghost"}
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length) { return false };
  if (prevProps.input !== nextProps.input) { return false };
  return true;
});
