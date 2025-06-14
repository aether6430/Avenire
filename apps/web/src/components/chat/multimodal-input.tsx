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
import { useDropzone } from 'react-dropzone';

import { ArrowUpIcon, Brain, Globe, Italic, PaperclipIcon, RotateCcw, Square, Loader2 } from 'lucide-react';
import { PreviewAttachment, Attachment } from './preview-attachment';
import { Button } from '@avenire/ui/components/button';
import { Textarea } from '@avenire/ui/components/textarea';
import equal from 'fast-deep-equal';
import { UseChatHelpers } from '@ai-sdk/react';
import { cn } from '@avenire/ui/utils';
import { useUploadThing } from '../../lib/uploadClient';
import { v4 as uuid } from "uuid"
import { deleteFile, deleteTrailingMessages } from '../../actions/actions';
import { AnimatePresence, motion } from 'motion/react';
import { Toggle } from "@avenire/ui/components/toggle"
import { useWhiteboardStore } from "../../stores/whiteboardStore";
import { exportToBlob } from '@excalidraw/excalidraw';

// Error types for better error handling
type InputErrorType =
  | 'UPLOAD_ERROR'
  | 'DELETE_ERROR'
  | 'MODEL_BUSY'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

// User-friendly error messages
const ERROR_MESSAGES: Record<InputErrorType, string> = {
  UPLOAD_ERROR: 'Unable to upload your file. Please try again or choose a different file.',
  DELETE_ERROR: 'Unable to remove the file. Please try again.',
  MODEL_BUSY: 'Please wait for the current response to complete before sending a new message.',
  VALIDATION_ERROR: 'There was an issue with your input. Please check and try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again or contact support if the issue persists.'
};

// Helper function to categorize errors
const categorizeError = (error: Error): InputErrorType => {
  if (error.message.includes('upload') || error.message.includes('file')) {
    return 'UPLOAD_ERROR';
  }
  if (error.message.includes('delete') || error.message.includes('remove')) {
    return 'DELETE_ERROR';
  }
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return 'VALIDATION_ERROR';
  }
  return 'UNKNOWN_ERROR';
};

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
  const MAX_FILES = 3;

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

  const [localStorageInput, setLocalStorageInput] = useLocalStorage('input', '',);

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
          continue;
        }

        const response = await startUpload([attachment.file]);
        if (!response?.[0]?.ufsUrl) {
          throw new Error('Upload failed: No URL returned');
        }

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
      } catch (error) {
        console.error('Upload error:', error);
        const errorType = categorizeError(error instanceof Error ? error : new Error('Upload failed'));
        toast.error(ERROR_MESSAGES[errorType], {
          description: 'If this issue persists, please try a different file or contact support.',
          duration: 5000
        });
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id ? { ...a, status: "failed" } : a
          )
        );
      }
    }
  };

  const removeAttachment = async ({ status, id, url }: { status: "uploading" | "pending" | "failed", id: string, url: undefined } | { status: "completed", id: undefined, url: string }): Promise<void> => {
    try {
      setAttachments((prev) => {
        if ((status === "uploading" || status === "pending")) {
          const target = prev.find((a) => a.id === id);
          target?.abortController?.abort();
        }

        return prev.filter((a) => (a.id !== id && a.url !== url));
      });

      if (status === "completed" && url) {
        const { error, success } = await deleteFile(url);
        if (!success) {
          throw new Error(typeof error === 'string' ? error : 'Failed to delete file');
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      const errorType = categorizeError(error instanceof Error ? error : new Error('Delete failed'));
      toast.error(ERROR_MESSAGES[errorType], {
        description: 'If this issue persists, please try again or contact support.',
        duration: 5000
      });
    }
  };

  const submitForm = useCallback(async () => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    // Whiteboard attachment logic
    const { whiteboardAPI, whiteboardLoading } = useWhiteboardStore.getState();
    async function getDataURL() {
      if (!whiteboardLoading && whiteboardAPI) {
        const elements = whiteboardAPI.getSceneElements();
        if (elements?.length) {
          const blob = await exportToBlob({
            elements,
            exportPadding: 0,
            quality: 0.7,
            files: whiteboardAPI.getFiles() || null,
            mimeType: "image/png",
          });

          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        };
      };
    }

    let whiteboardAttachment: Attachment | null = null;
    if (whiteboardAPI) {
      const elements = whiteboardAPI.getSceneElements();
      if (elements && elements.length > 0) {
        const blob = await getDataURL();
        if (blob) {
          whiteboardAttachment = {
            id: uuid(),
            file: new File([blob], 'whiteboard.png', { type: 'image/png' }), // TODO: fix this
            name: 'whiteboard.png',
            url: blob,
            contentType: 'image/png',
            status: 'completed',
            abortController: undefined,
          };
        }
      }
    }

    const allAttachments = whiteboardAttachment
      ? [...attachments, whiteboardAttachment]
      : attachments;

    handleSubmit(undefined, {
      experimental_attachments: allAttachments,
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (attachments.length + acceptedFiles.length > MAX_FILES) {
      toast.error('File limit exceeded', {
        description: `You can only upload up to ${MAX_FILES} files per message.`,
        duration: 3000
      });
      return;
    }

    const newAttachments: Attachment[] = acceptedFiles.map((file) => {
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
  }, [attachments.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div
      {...getRootProps()}
      className="relative w-full flex flex-col bg-muted gap-4 rounded-2xl rounded-b-none overflow-hidden"
    >
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="border-2 border-dashed border-primary rounded-lg p-8 text-center"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <PaperclipIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium">Drop your files here</p>
              <p className="text-sm text-muted-foreground mt-2">
                You can upload up to {MAX_FILES} files
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
        {...getInputProps()}
      />

      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-2 p-3 pb-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
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
            className={cn("min-h-[24px] max-h-[calc(30dvh)] [&::-webkit-scrollbar-thumb]:bg-background overflow-visible resize-none bg-muted pb-10 border-none! shadow-none!", className)}
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
                  toast.error(ERROR_MESSAGES.MODEL_BUSY, {
                    description: 'The AI is currently processing your previous message.',
                    duration: 3000
                  });
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
              <SendButton
                input={input}
                submitForm={submitForm}
                uploadQueue={uploadQueue}
                status={status}
                reload={reload}
                messages={messages}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-row gap-2 p-2">
          <Toggle
            size="sm"
            aria-label="Toggle Thinking"
            disabled={researchEnabled}
            onClick={toggleThinking}
            className="transition-colors"
          >
            <Brain className="h-4 w-4" />
            Thinking
          </Toggle>
          <Toggle
            size="sm"
            aria-label="Toggle Deep Research"
            disabled={thinkingEnabled}
            onClick={toggleResearch}
            className="transition-colors"
          >
            <Globe className="h-4 w-4" />
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
      size="icon"
      disabled={status !== 'ready'}
      variant="ghost"
      className="transition-colors"
    >
      <PaperclipIcon className="h-4 w-4" />
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
      size="icon"
      variant="ghost"
      onClick={(event) => {
        event.preventDefault();
        reload()
      }}
      className="transition-colors"
    >
      <RotateCcw className="h-4 w-4" />
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
      size="icon"
      variant="ghost"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
      className="transition-colors"
    >
      <Square className="h-4 w-4" />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
  status,
  reload,
  messages,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
  status: UseChatHelpers['status'];
  reload: UseChatHelpers['reload'];
  messages: Array<UIMessage>;
}) {
  if (status === 'error') {
    return (
      <Button
        data-testid="reload-button"
        size="icon"
        variant="ghost"
        onClick={async (event) => {
          event.preventDefault();
          const lastMessage = messages.at(-1);
          if (lastMessage?.role === 'user') {
            reload();
          } else {
            try {
              if (lastMessage?.id) {
                const result = await deleteTrailingMessages({
                  id: lastMessage.id,
                });
                if (result.success) {
                  reload();
                }
              }
            } catch (error) {
              console.error('Failed to delete trailing messages:', error);
            }
          }
        }}
        className="transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    );
  }

  if (status === 'submitted') {
    return (
      <Button
        data-testid="loading-button"
        size="icon"
        variant="ghost"
        disabled
        className="transition-colors"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      data-testid="send-button"
      size="icon"
      variant="ghost"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
      className="transition-colors"
    >
      <ArrowUpIcon className="h-4 w-4" />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length) { return false };
  if (prevProps.input !== nextProps.input) { return false };
  if (prevProps.status !== nextProps.status) { return false };
  return true;
});
