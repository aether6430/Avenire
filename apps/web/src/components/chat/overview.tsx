"use client";

import { motion } from "motion/react";

export const Overview = ({
  title,
  userName,
}: {
  title: string;
  userName?: string;
}) => {
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
          {title}
        </h1>
        {userName ? (
          <p className="text-muted-foreground text-sm sm:text-base">
            {`Hey ${userName}!`}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
};
