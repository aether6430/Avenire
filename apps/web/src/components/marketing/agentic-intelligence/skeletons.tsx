"use client";
import { motion } from "motion/react";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useTypewriter } from "@/components/marketing/hooks/use-typewriter";
import {
  AttachmentIcon,
  SendIcon,
} from "@/components/marketing/icons/bento-icons";
import { LogoSVG } from "../logo";

function buildOccurrenceKeys<T>(
  items: readonly T[],
  toBaseKey: (item: T) => string
) {
  const seenKeys = new Map<string, number>();
  return items.map((item) => {
    const baseKey = toBaseKey(item);
    const occurrence = seenKeys.get(baseKey) ?? 0;
    seenKeys.set(baseKey, occurrence + 1);
    return occurrence === 0 ? baseKey : `${baseKey}-${occurrence}`;
  });
}

const TYPING_SPEED = 30;

export const TextToWorkflowBuilderSkeleton = () => {
  const initialChat = [
    {
      role: "user",
      content: "Hello, how are you?",
    },
    {
      role: "assistant",
      content: "I'm good, thank you! How can I help you today?",
    },
    {
      role: "user",
      content:
        "Can you turn this lecture note into a study plan and mindset cards?",
    },
    {
      role: "assistant",
      content:
        "Yes. I found the main concepts, grouped them by dependency, and drafted a review plan.",
    },
  ];

  const [chat, setChat] = useState(initialChat);
  const [inputText, setInputText] = useState("");
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [currentMessageComplete, setCurrentMessageComplete] = useState(false);
  const [chatContainerRef, setChatContainerRef] =
    useState<HTMLDivElement | null>(null);
  const chatKeys = useMemo(
    () =>
      buildOccurrenceKeys(
        chat,
        (message) => `${message.role}\u0000${message.content}`
      ),
    [chat]
  );

  const INITIAL_DELAY = 200;
  const MESSAGE_DELAY = 400;
  const RANDOM_MESSAGES = [
    "I can explain the next step with a diagram.",
    "I found a gap in the notes and marked it for review.",
    "I turned that answer into three recall cards.",
    "This theorem depends on the definition from the previous section.",
    "I added a short summary to your workspace note.",
  ];

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newMessages = [
        ...chat,
        {
          role: "user",
          content: inputText.trim(),
        },
        {
          role: "assistant",
          content:
            RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)],
        },
      ];
      setChat(newMessages);
      setVisibleMessages(newMessages.length);
      setInputText("");
      setCurrentMessageComplete(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleMessages(1);
    }, INITIAL_DELAY);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentMessageComplete && visibleMessages < chat.length) {
      const timer = setTimeout(() => {
        setVisibleMessages((prev) => prev + 1);
        setCurrentMessageComplete(false);
      }, MESSAGE_DELAY);

      return () => clearTimeout(timer);
    }
  }, [currentMessageComplete, visibleMessages, chat.length]);

  useEffect(() => {
    if (chatContainerRef) {
      chatContainerRef.scrollTo({
        top: chatContainerRef.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatContainerRef]);

  return (
    <motion.div className="relative mx-auto mt-2 h-full max-h-70 min-h-40 w-[85%] p-4">
      <div className="absolute inset-x-0 -bottom-4 mx-auto flex w-[85%] items-center justify-between rounded-lg border border-gray-300 bg-white shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-neutral-900">
        <input
          className="flex-1 border-none px-4 py-4 text-xs placeholder-neutral-600 focus:outline-none"
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask Avenire"
          style={{ caretColor: "transparent" }}
          type="text"
          value={inputText}
        />
        <div className="mr-4 flex items-center gap-2">
          <AttachmentIcon />
          <button className="cursor-pointer" onClick={handleSendMessage}>
            <SendIcon />
          </button>
        </div>
      </div>
      <div
        className="mask-bg-gradient-to-b mask-t-from-70% mask-b-from-75% flex max-h-[calc(100%-1rem)] flex-col gap-4 overflow-y-auto from-white to-transparent pt-4 pb-16 dark:from-neutral-900 dark:to-transparent"
        ref={setChatContainerRef}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {chat.slice(0, visibleMessages).map((message, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            key={chatKeys[index]}
            transition={{ duration: 0.3 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            {message.role === "user" ? (
              <UserMessage
                content={message.content}
                isActive={index === visibleMessages - 1}
                onComplete={() => setCurrentMessageComplete(true)}
              />
            ) : (
              <AssistantMessage
                content={message.content}
                isActive={index === visibleMessages - 1}
                onComplete={() => setCurrentMessageComplete(true)}
              />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const UserMessage = ({
  content,
  isActive,
  onComplete,
}: {
  content: string;
  isActive: boolean;
  onComplete: () => void;
}) => {
  const { displayText, isComplete } = useTypewriter(
    isActive ? content : content,
    TYPING_SPEED
  );

  useEffect(() => {
    if (isComplete && isActive) {
      onComplete();
    }
  }, [isComplete, isActive, onComplete]);

  return (
    <div className="flex justify-end gap-3">
      <div className="flex max-w-xs flex-col gap-1">
        <div className="rounded-2xl rounded-br-md bg-brand px-4 py-2 text-[#1b2733] text-sm">
          {isActive ? displayText : content}
          {isActive && !isComplete && <span className="animate-pulse">|</span>}
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand/70 font-medium text-white text-xs">
        A
      </div>
    </div>
  );
};

const AssistantMessage = ({
  content,
  isActive,
  onComplete,
}: {
  content: string;
  isActive: boolean;
  onComplete: () => void;
}) => {
  const { displayText, isComplete } = useTypewriter(
    isActive ? content : content,
    TYPING_SPEED
  );

  useEffect(() => {
    if (isComplete && isActive) {
      onComplete();
    }
  }, [isComplete, isActive, onComplete]);

  return (
    <div className="flex gap-3 px-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-brand/12 font-medium text-white text-xs shadow-[0_0_18px_rgba(171,196,255,0.16)]">
        <LogoSVG className="size-4 text-brand" />
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <div className="rounded-2xl rounded-bl-md border border-brand/18 bg-[#162033] px-4 py-2 text-sm text-white/86 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
          {isActive ? displayText : content}
          {isActive && !isComplete && <span className="animate-pulse">|</span>}
        </div>
      </div>
    </div>
  );
};
