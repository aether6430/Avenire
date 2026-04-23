"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
} from "react";
import { Shimmer } from "@/components/chat/shimmer";
import { cn } from "@/lib/utils";

const fallbackMessages = ["Thinking", "Planning", "Refining", "Checking"];
const spinnerCells = Array.from({ length: 9 }, (_, index) => index);

function RotatingMessage({
  longestMessage,
  messages,
}: {
  longestMessage: string;
  messages: string[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [messages]);

  return (
    <span className="inline-grid overflow-hidden text-[13px] font-medium">
      <Shimmer
        aria-hidden="true"
        as="span"
        className="invisible col-start-1 row-start-1 text-[13px]"
      >
        {longestMessage}
      </Shimmer>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{
            opacity: 1,
            transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
            y: 0,
          }}
          className="col-start-1 row-start-1"
          exit={{
            opacity: 0,
            transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] },
            y: "-80%",
          }}
          initial={{ opacity: 0, y: "80%" }}
          key={messages[index]}
        >
          <Shimmer as="span" className="text-[13px]">
            {messages[index]}
          </Shimmer>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function ChatSpinnerGlyph({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("grid grid-cols-3 gap-[2px] text-foreground/72", className)}
    >
      {spinnerCells.map((cell) => (
        <motion.span
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            opacity: [0.22, 1, 0.22],
            scale: [0.92, 1, 0.92],
          }}
          className={cn(
            "size-[3px] rounded-[1px]",
            "bg-[linear-gradient(90deg,hsl(var(--foreground)/0.18)_0%,hsl(var(--foreground)/0.92)_50%,hsl(var(--foreground)/0.18)_100%)]",
            "bg-[length:220%_100%]"
          )}
          key={cell}
          transition={{
            delay: cell * 0.06,
            duration: 1.25,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}

export const ChatSpinner = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { messages?: string[] }
>(function ChatSpinner({ className, messages, ...props }, ref) {
  const resolvedMessages = useMemo(() => {
    const nextMessages = (messages ?? [])
      .map((message) => message.trim())
      .filter(Boolean)
      .slice(0, 4);

    return nextMessages.length > 0 ? nextMessages : fallbackMessages;
  }, [messages]);

  const longestMessage = useMemo(
    () =>
      resolvedMessages.reduce((longest, word) =>
        longest.length >= word.length ? longest : word
      ),
    [resolvedMessages]
  );

  return (
    <div
      {...props}
      className={cn("flex items-center gap-2 px-3 py-1.5", className)}
      ref={ref}
      role="status"
    >
      <ChatSpinnerGlyph className="size-4" />
      <RotatingMessage
        longestMessage={longestMessage}
        messages={resolvedMessages}
      />
    </div>
  );
});
