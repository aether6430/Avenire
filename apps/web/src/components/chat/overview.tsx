"use client";

import { motion } from "motion/react";

export const Overview = ({ userName }: { userName?: string }) => {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl px-2"
      exit={{ opacity: 0, y: 8 }}
      initial={{ opacity: 0, y: 12 }}
      key="overview"
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="mx-auto max-w-xl rounded-xl px-5 py-2 text-center">
        <h1 className="truncate pb-1 font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          {userName ? `Hey ${userName}!` : "hey there"}
        </h1>
      </div>
    </motion.div>
  );
};

export function MobileEmptyChatOverview({ userName }: { userName?: string }) {
  const greeting = userName
    ? `How can I help, ${userName.split(" ")[0]}?`
    : "How can I help?";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-[31rem] overflow-hidden px-5"
      exit={{ opacity: 0, y: 8 }}
      initial={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          opacity: [0.5, 0.68, 0.5],
        }}
        className="absolute inset-x-[-22%] bottom-[-8rem] h-[26rem] bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklch,var(--primary)_24%,transparent)_0%,color-mix(in_oklch,var(--primary)_10%,transparent)_42%,transparent_76%)] blur-3xl"
        transition={{
          duration: 16,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />
      <motion.div
        animate={{ opacity: [0.14, 0.24, 0.14], x: [0, -8, 0] }}
        className="absolute inset-x-0 bottom-0 h-[24rem] bg-[radial-gradient(circle,color-mix(in_oklch,var(--primary)_34%,transparent)_1px,transparent_1.5px)] [background-size:8px_8px] [mask-image:linear-gradient(to_top,black_0%,black_62%,transparent_100%)]"
        transition={{
          duration: 18,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />
      <div className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-5 max-w-[21rem] overflow-hidden py-5">
        <div className="relative pt-8">
          <h1 className="max-w-[18rem] font-medium text-4xl text-foreground leading-[1.02] tracking-normal">
            {greeting}
          </h1>
        </div>
      </div>
    </motion.div>
  );
}
