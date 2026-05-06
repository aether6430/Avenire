"use client";
import {
  AttachmentIcon,
  IntegrationsLogo,
  SendIcon,
} from "@/components/marketing/icons/bento-icons";
import { DivideX } from "../divide";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTypewriter } from "@/components/marketing/hooks/use-typewriter";
import { LogoSVG } from "../logo";
import { IconBlock } from "../common/icon-block";
import {
  Brain,
  Cards,
  FilePdf,
  Files,
  Graph,
  MarkdownLogo,
  Question,
  Sparkle,
  WarningDiamond,
} from "@phosphor-icons/react";

const StudyToken = ({
  label,
  className,
}: {
  label: string;
  className?: string;
}) => {
  const normalizedLabel = label.toLowerCase();
  const iconClassName = "size-[70%]";
  const icon =
    normalizedLabel === "pdf" ? (
      <FilePdf weight="duotone" className={iconClassName} />
    ) : normalizedLabel === "md" ? (
      <MarkdownLogo weight="duotone" className={iconClassName} />
    ) : normalizedLabel === "cards" || normalizedLabel === "srs" ? (
      <Cards weight="duotone" className={iconClassName} />
    ) : normalizedLabel === "graph" ? (
      <Graph weight="duotone" className={iconClassName} />
    ) : normalizedLabel === "files" ? (
      <Files weight="duotone" className={iconClassName} />
    ) : normalizedLabel === "gap" ? (
      <WarningDiamond weight="duotone" className={iconClassName} />
    ) : normalizedLabel === "q" ? (
      <Question weight="duotone" className={iconClassName} />
    ) : normalizedLabel === "ai" ? (
      <Sparkle weight="duotone" className={iconClassName} />
    ) : (
      <Brain weight="duotone" className={iconClassName} />
    );

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-sm border border-brand/25 bg-brand/10 text-brand",
        className,
      )}
      title={label}
    >
      {icon}
    </span>
  );
};

const makeStudyToken =
  (label: string) =>
  ({ className }: React.SVGProps<SVGSVGElement>) => (
    <StudyToken label={label} className={className} />
  );

export const LLMModelSelectorSkeleton = () => {
  const models = [
    {
      name: "Fast explanation",
      logo: makeStudyToken("Q"),
      status: "Ready",
      variant: "danger",
    },
    {
      name: "Deep reasoning",
      logo: makeStudyToken("AI"),
      status: "Connected",
      variant: "success",
    },
    {
      name: "Review builder",
      logo: makeStudyToken("SRS"),
      status: "Queued",
      variant: "warning",
    },
  ];
  return (
    <motion.div className="relative mx-auto mt-20 h-full max-h-70 min-h-40 w-[85%] rounded-2xl border-t border-gray-300 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 1.5 }}
        className="shadow-aceternity absolute -top-10 -right-10 z-20 flex w-40 shrink-0 flex-col items-start rounded-lg bg-white text-xs dark:bg-neutral-900"
      >
        <div className="flex w-full items-center justify-between p-2">
          <div className="flex items-center gap-2 font-medium">
            <StudyToken label="AI" />
            Session
          </div>
          <p className="font-mono text-gray-600">Deep</p>
        </div>
        <DivideX />
        <div className="m-2 rounded-sm border border-brand/70 bg-brand/10 px-2 py-0.5 text-brand">
          Connected
        </div>
      </motion.div>
      <div className="mb-4 flex gap-2">
        <div className="h-3 w-3 rounded-full bg-red-500"></div>
        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
        <div className="h-3 w-3 rounded-full bg-green-500"></div>
      </div>
      <div className="mt-12 flex items-center gap-2">
        <IntegrationsLogo />
        <span className="text-charcoal-700 text-sm font-medium dark:text-neutral-200">
          Study modes
        </span>
        <span className="text-charcoal-700 rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
          3
        </span>
      </div>
      <DivideX className="mt-2" />
      {models.map((model, index) => (
        <div className="relative" key={model.name + index}>
          <motion.div
            key={model.name + index}
            className="mt-4 flex items-center justify-between gap-2"
            initial={{ clipPath: "inset(0 100% 0 0)", filter: "blur(10px)" }}
            whileInView={{ clipPath: "inset(0 0% 0 0)", filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{
              duration: 1,
              delay: index * 1,
              ease: "easeInOut",
            }}
          >
            <div className="flex items-center gap-2">
              <model.logo className="h-4 w-4 shrink-0" />
              <span className="text-charcoal-700 text-sm font-medium dark:text-neutral-200">
                {model.name}
              </span>
            </div>

            <div
              className={cn(
                "rounded-sm border px-2 py-0.5 text-xs",
                model.variant === "success" &&
                  "border-emerald-500 bg-emerald-50 text-emerald-500 dark:bg-emerald-50/10",
                model.variant === "warning" &&
                  "border-yellow-500 bg-yellow-50 text-yellow-500 dark:bg-yellow-50/10",
                model.variant === "danger" &&
                  "border-red-500 bg-red-50 text-red-500 dark:bg-red-50/10",
              )}
            >
              {model.status}
            </div>
          </motion.div>
          <motion.div
            initial={{
              left: 0,
              opacity: 0,
            }}
            whileInView={{
              left: "100%",
              opacity: [0, 1, 1, 1, 0],
            }}
            viewport={{ once: true }}
            transition={{
              left: {
                duration: 1,
                delay: index * 1,
                ease: "easeInOut",
              },
              opacity: {
                duration: 1,
                delay: index * 1,
                ease: "easeInOut",
              },
            }}
            className="absolute inset-y-0 left-0 h-full w-[2px] bg-gradient-to-t from-transparent via-brand to-transparent"
          >
            {Array.from({ length: 8 }).map((_, sparkleIndex) => {
              const randomX = Math.random() * 100 - 50;
              const randomY = Math.random() * 100 - 50;
              const randomDelay = Math.random() * 0.8;
              const randomDuration = 0.5 + Math.random() * 1;
              const randomScale = 0.5 + Math.random() * 0.5;

              return (
                <motion.div
                  key={sparkleIndex}
                  initial={{
                    opacity: 0,
                    scale: 0,
                    x: 0,
                    y: 0,
                  }}
                  whileInView={{
                    opacity: [0, 1, 0],
                    scale: [0, randomScale, 0],
                    x: randomX,
                    y: randomY,
                    rotate: [0, 360],
                  }}
                  viewport={{ once: true }}
                  transition={{
                    duration: randomDuration,
                    delay: index * 1 + randomDelay,
                    ease: "easeOut",
                  }}
                  className="absolute top-1/2 left-1/2 h-1 w-1 text-xs text-brand"
                >
                  ✨
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      ))}
    </motion.div>
  );
};

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
        "Can you turn this lecture note into a study plan and flashcards?",
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
  }, [visibleMessages, chatContainerRef]);

  return (
    <motion.div className="relative mx-auto mt-2 h-full max-h-70 min-h-40 w-[85%] p-4">
      <div className="absolute inset-x-0 -bottom-4 mx-auto flex w-[85%] items-center justify-between rounded-lg border border-gray-300 bg-white shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] dark:border-neutral-700 dark:bg-neutral-800">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 border-none px-4 py-4 text-xs placeholder-neutral-600 focus:outline-none"
          placeholder="Ask Avenire"
        />
        <div className="mr-4 flex items-center gap-2">
          <AttachmentIcon />
          <button onClick={handleSendMessage} className="cursor-pointer">
            <SendIcon />
          </button>
        </div>
      </div>
      <div
        ref={setChatContainerRef}
        className="mask-bg-gradient-to-b flex max-h-[calc(100%-1rem)] flex-col gap-4 overflow-y-auto from-white to-transparent mask-t-from-70% mask-b-from-70% pt-4 pb-16 dark:from-neutral-900 dark:to-transparent"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {chat.slice(0, visibleMessages).map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
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
    TYPING_SPEED,
  );

  useEffect(() => {
    if (isComplete && isActive) {
      onComplete();
    }
  }, [isComplete, isActive, onComplete]);

  return (
    <div className="flex justify-end gap-3">
      <div className="flex max-w-xs flex-col gap-1">
        <div className="rounded-2xl rounded-br-md bg-brand px-4 py-2 text-sm text-[#1b2733]">
          {isActive ? displayText : content}
          {isActive && !isComplete && <span className="animate-pulse">|</span>}
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand/70 text-xs font-medium text-white">
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
    TYPING_SPEED,
  );

  useEffect(() => {
    if (isComplete && isActive) {
      onComplete();
    }
  }, [isComplete, isActive, onComplete]);

  return (
    <div className="flex gap-3 px-1">
      <div className="shadow-aceternity flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-medium text-white dark:bg-neutral-900">
        <LogoSVG className="size-3.5 text-black dark:text-white" />
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <div className="text-charcoal-700 rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2 text-sm">
          {isActive ? displayText : content}
          {isActive && !isComplete && <span className="animate-pulse">|</span>}
        </div>
      </div>
    </div>
  );
};

export const NativeToolsIntegrationSkeleton = () => {
  return (
    <>
      <motion.div className="relative mx-auto my-12 hidden h-full max-h-70 min-h-80 max-w-[67rem] grid-cols-2 p-4 lg:grid">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-10">
            <TextIconBlock
              icon={<StudyToken label="PDF" />}
              text="Source search"
            >
              <TopSVG className="absolute top-2 -right-84" />
            </TextIconBlock>
            <TextIconBlock
              icon={<StudyToken label="MD" />}
              text="Markdown notes"
            >
              <MiddleSVG className="absolute top-2 -right-84" />
            </TextIconBlock>
            <TextIconBlock
              icon={<StudyToken label="SRS" />}
              text="Review cards"
            >
              <BottomSVG className="absolute -right-84 bottom-2" />
            </TextIconBlock>
          </div>
          <div className="relative h-14 w-14 overflow-hidden rounded-md border border-brand/35 bg-gray-200 p-px shadow-xl dark:bg-neutral-700">
            <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic [background-image:conic-gradient(at_center,transparent,var(--color-brand)_20%,transparent_30%)] [animation-duration:2s]"></div>
            <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full [background-image:conic-gradient(at_center,transparent,var(--color-brand)_20%,transparent_30%)] [animation-delay:1s] [animation-duration:2s]"></div>
            <div className="relative z-20 flex h-full w-full items-center justify-center rounded-[5px] bg-white dark:bg-neutral-900">
              <LogoSVG className="size-8 text-black dark:text-white" />
            </div>
          </div>
        </div>
        <div className="relative flex h-full w-full items-center justify-start">
          <RightSideSVG />
          <div className="relative flex flex-col items-center gap-2">
            <span className="relative z-20 rounded-sm border border-brand/70 bg-brand/10 px-2 py-0.5 text-xs text-brand">
              Connected
            </span>
            <div className="absolute inset-x-0 -top-30 flex h-full flex-col items-center">
              <IconBlock icon={<StudyToken label="MD" />} />
              <VerticalLine />
              <VerticalLine />
              <IconBlock icon={<StudyToken label="Graph" />} />
            </div>
          </div>
          <div className="2 absolute -top-4 right-30 flex h-full flex-col items-center">
            <IconBlock icon={<StudyToken label="Files" />} />
            <VerticalLine />
            <IconBlock icon={<StudyToken label="Cards" />} />
          </div>
          <RightSideSVG />
          <IconBlock icon={<StudyToken label="AI" />} />
        </div>
      </motion.div>
    </>
  );
};
const VerticalLine = (
  props: React.SVGProps<SVGSVGElement> & { stopColor?: string },
) => {
  return (
    <svg
      width="1"
      height="81"
      viewBox="0 0 1 81"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      {...props}
    >
      <line
        y1="-0.5"
        x2="80"
        y2="-0.5"
        transform="matrix(0 -1 -1 0 0 80.5)"
        stroke="var(--color-line)"
      />
      <line
        y1="-0.5"
        x2="80"
        y2="-0.5"
        transform="matrix(0 -1 -1 0 0 80.5)"
        stroke="url(#vertical-line-gradient)"
      />
      <defs>
        <motion.linearGradient
          id="vertical-line-gradient"
          initial={{
            x1: 0,
            x2: 2,
            y1: "0%",
            y2: "0%",
          }}
          animate={{
            x1: 0,
            x2: 2,
            y1: "80%",
            y2: "100%",
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.5" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

const RightSideSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="314"
      height="2"
      viewBox="0 0 314 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        x1="0.5"
        y1="1"
        x2="313.5"
        y2="1"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />
      <line
        x1="0.5"
        y1="1"
        x2="313.5"
        y2="1"
        stroke="url(#horizontal-line-gradient)"
        strokeLinecap="round"
      />
      <defs>
        <motion.linearGradient
          id="horizontal-line-gradient"
          initial={{
            y1: 0,
            y2: 1,
            x1: "-10%",
            x2: "0%",
          }}
          animate={{
            y1: 0,
            y2: 1,
            x1: "110%",
            x2: "120%",
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.5" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

const TopSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="312"
      height="33"
      viewBox="0 0 312 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        x1="0.5"
        y1="1"
        x2="311.5"
        y2="1"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />
      <line
        x1="311.5"
        y1="1"
        x2="311.5"
        y2="32"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />

      <line
        x1="0.5"
        y1="1"
        x2="311.5"
        y2="1"
        stroke="url(#line-one-gradient)"
        strokeLinecap="round"
      />
      <defs>
        <motion.linearGradient
          gradientUnits="userSpaceOnUse"
          id="line-one-gradient"
          initial={{
            x1: "-20%",
            x2: "0%",
            y1: 1,
            y2: 0,
          }}
          animate={{
            x1: "105%",
            x2: "120%",
            y1: 1,
            y2: 0,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-brand)" />
          <stop offset="0.66" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

export const MiddleSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="323"
      height="2"
      viewBox="0 0 323 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        x1="0.5"
        y1="1"
        x2="322.5"
        y2="1"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />
      <line
        x1="0.5"
        y1="1"
        x2="322.5"
        y2="1"
        stroke="url(#line-two-gradient)"
        strokeLinecap="round"
      />
      <defs>
        <motion.linearGradient
          gradientUnits="userSpaceOnUse"
          id="line-two-gradient"
          initial={{
            x1: "-20%",
            x2: "0%",
            y1: 1,
            y2: 0,
          }}
          animate={{
            x1: "105%",
            x2: "120%",
            y1: 1,
            y2: 0,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-brand)" />
          <stop offset="0.66" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

export const BottomSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="326"
      height="32"
      viewBox="0 0 326 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line y1="31" x2="325" y2="31" stroke="var(--color-line)" />

      <line
        x1="325.5"
        y1="31"
        x2="325.5"
        y2="1"
        stroke="var(--color-line)"
        strokeLinecap="round"
      />
      <line y1="31" x2="325" y2="31" stroke="url(#line-three-gradient)" />

      <defs>
        <motion.linearGradient
          id="line-three-gradient"
          gradientUnits="userSpaceOnUse"
          initial={{
            x1: "-20%",
            x2: "0%",
            y1: 1,
            y2: 0,
          }}
          animate={{
            x1: "105%",
            x2: "120%",
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            repeatDelay: 1,
          }}
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-yellow-500)" />
          <stop offset="0.66" stopColor="var(--color-yellow-500)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};

const TextIconBlock = ({
  icon,
  text,
  children,
}: {
  icon: React.ReactNode;
  text: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="relative flex items-center gap-2">
      {icon}
      <span className="text-charcoal-700 text-sm font-medium dark:text-neutral-200">
        {text}
      </span>
      {children}
    </div>
  );
};
