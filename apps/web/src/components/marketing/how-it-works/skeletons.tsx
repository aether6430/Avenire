"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DivideX } from "../divide";
import { motion, useMotionValue, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { Card } from "../tech-card";
import { Scale } from "../scale";
import { LogoSVG } from "../logo";
import { IntegrationsLogo } from "@/components/marketing/icons/bento-icons";
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

const CONNECTED_BAR_SCALES = [
  { initial: 0.24, animate: 0.76 },
  { initial: 0.31, animate: 0.89 },
  { initial: 0.37, animate: 0.97 },
] as const;

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

export const DesignYourWorkflowSkeleton = () => {
  return (
    <div className="mt-12 flex flex-col items-center">
      <div className="relative">
        <Card
          title="Source files"
          subtitle="resnet.pdf"
          logo={<StudyToken label="PDF" />}
          cta="Indexed"
          tone="default"
        />
        <LeftSVG className="absolute top-12 -left-32" />
        <RightSVG className="absolute top-12 -right-32" />
        <CenterSVG className="absolute top-24 right-[107px]" />
      </div>

      <div className="mt-12 flex flex-row gap-4.5">
        <Card
          title="Misconception"
          subtitle="gradient flow"
          logo={<StudyToken label="Gap" />}
          cta="Logged"
          tone="danger"
          delay={0.2}
        />
        <Card
          title="Markdown note"
          subtitle="ResNet"
          logo={<StudyToken label="MD" />}
          cta="Saved"
          tone="default"
          delay={0.4}
        />
        <Card
          title="Review queue"
          subtitle="12 cards"
          logo={<StudyToken label="SRS" />}
          cta="Ready"
          tone="success"
          delay={0.6}
        />
      </div>
    </div>
  );
};

export const ConnectYourTooklsSkeleton = () => {
  const text = `Explain why residual shortcuts reduce degradation in deep networks.`;
  const [mounted, setMounted] = useState(false);
  const randomWidth = useMemo(() => Math.random() * 100, [mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative flex h-full w-full items-center justify-between">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative h-70 w-60 -translate-x-2 rounded-2xl border-t border-gray-300 bg-white p-4 shadow-2xl md:translate-x-0 dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div className="absolute -top-4 -right-4 flex h-14 w-14 items-center justify-center rounded-lg bg-white shadow-xl">
          <Scale />
          <StudyToken label="AI" />
        </div>
        <div className="mt-12 flex items-center gap-2">
          <IntegrationsLogo />
          <span className="text-charcoal-700 text-sm font-medium dark:text-neutral-200">
            Tasks
          </span>
        </div>
        <DivideX className="mt-2" />

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-charcoal-700 text-[10px] leading-loose font-normal md:text-xs dark:text-neutral-200">
              {text.split(/(\s+)/).map((word, index) => (
                <motion.span
                  key={`w-${word}`}
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.02,
                    ease: "linear",
                  }}
                  className="inline-block"
                >
                  {word === " " ? "\u00A0" : word}
                </motion.span>
              ))}
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-col">
          {[...Array(2)].map((_, index) => (
            <motion.div
              key={`width-bar-right-${index}`}
              initial={{
                scaleX: 0,
              }}
              animate={{
                scaleX: randomWidth / 100,
              }}
              transition={{
                duration: 4,
                delay: index * 0.2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="mt-2 h-4 w-full rounded-full bg-gray-200 dark:bg-neutral-800"
              style={{ transformOrigin: "left" }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute inset-x-0 z-30 hidden items-center justify-center md:flex"
      >
        <div className="size-3 rounded-full border-2 border-brand/70 bg-white dark:bg-neutral-800" />
        <div className="h-[2px] w-38 bg-brand/100" />
        <div className="size-3 rounded-full border-2 border-brand/70 bg-white dark:bg-neutral-800" />
      </motion.div>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="relative h-70 w-60 translate-x-10 rounded-2xl border-t border-gray-300 bg-white p-4 shadow-2xl md:translate-x-0 dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div className="absolute -top-4 -left-4 flex h-14 w-14 items-center justify-center rounded-lg bg-white shadow-xl dark:bg-neutral-800">
          <Scale />
          <LogoSVG className="relative z-20 h-8 w-8" />
        </div>
        <div className="mt-12 flex items-center gap-2">
          <IntegrationsLogo className="dark:text-neutral-200" />
          <span className="text-charcoal-700 text-xs font-medium md:text-sm dark:text-neutral-200">
            Learning tools
          </span>
          <span className="text-charcoal-700 rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
            4
          </span>
        </div>
        <DivideX className="mt-2" />
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StudyToken label="PDF" />
            <span className="text-charcoal-700 text-xs font-medium md:text-sm dark:text-neutral-200">
              Source search
            </span>
          </div>

          <div className="rounded-sm border border-brand/70 bg-brand/10 px-2 py-0.5 text-xs text-brand">
            Connected
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StudyToken label="SRS" />
            <span className="text-charcoal-700 text-xs font-medium md:text-sm dark:text-neutral-200">
              Spaced review
            </span>
          </div>

          <div className="rounded-sm border border-brand/70 bg-brand/10 px-2 py-0.5 text-xs text-brand">
            Connected
          </div>
        </div>
        <div className="mt-2 flex flex-col">
          {CONNECTED_BAR_SCALES.map((scale, index) => (
            <motion.div
              key={`width-bar-right-${scale.initial}`}
              initial={{
                scaleX: scale.initial,
              }}
              animate={{
                scaleX: scale.animate,
              }}
              transition={{
                duration: 4,
                delay: index * 0.2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="mt-2 h-4 w-full rounded-full bg-gray-200 dark:bg-neutral-800"
              style={{ transformOrigin: "left" }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

interface ScrollingDeployCardProps {
  branch: string;
  index: number;
  itemHeight: number;
  offset: number;
  subtitle: string;
  title: string;
  variant?: "default" | "danger" | "success" | "warning";
  y: MotionValue<number>;
}

function ScrollingDeployCard({
  branch,
  index,
  itemHeight,
  offset,
  subtitle,
  title,
  variant,
  y,
}: ScrollingDeployCardProps) {
  const scale = useTransform(
    y,
    [
      offset + (index - 2) * -itemHeight,
      offset + (index - 1) * -itemHeight,
      offset + index * -itemHeight,
      offset + (index + 1) * -itemHeight,
      offset + (index + 2) * -itemHeight,
    ],
    [0.85, 0.95, 1.1, 0.95, 0.85],
  );
  const background = useTransform(
    y,
    [
      offset + (index - 1) * -itemHeight,
      offset + index * -itemHeight,
      offset + (index + 1) * -itemHeight,
    ],
    ["#101114", "#abc4ff", "#101114"],
  );
  const borderColor = useTransform(
    y,
    [
      offset + (index - 1) * -itemHeight,
      offset + index * -itemHeight,
      offset + (index + 1) * -itemHeight,
    ],
    ["#101114", "#abc4ff", "#101114"],
  );

  return (
    <motion.div
      className="mx-auto mt-4 w-full max-w-sm shrink-0 rounded-2xl shadow-xl"
      style={{ background, borderColor, scale }}
    >
      <DeployCard
        branch={branch}
        subtitle={subtitle}
        title={title}
        variant={variant}
      />
    </motion.div>
  );
}

export const DeployAndScaleSkeleton = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const deployCards = [
    { title: "Residual block note", subtitle: "2h ago", branch: "markdown" },
    {
      title: "Shortcut connection",
      subtitle: "10m ago",
      branch: "misconception",
      variant: "success" as const,
    },
    { title: "Gradient flow", subtitle: "45m ago", branch: "review" },
    {
      title: "ResNet paper",
      subtitle: "1h ago",
      branch: "source",
      variant: "success" as const,
    },
    {
      title: "Bottleneck blocks",
      subtitle: "2h ago",
      branch: "cards",
      variant: "warning" as const,
    },
    {
      title: "Training depth",
      subtitle: "3h ago",
      branch: "note",
      variant: "success" as const,
    },
    {
      title: "Skipped assumption",
      subtitle: "4h ago",
      branch: "gap",
      variant: "danger" as const,
    },
    {
      title: "Concept graph edge",
      subtitle: "5h ago",
      branch: "linked",
      variant: "default" as const,
    },
    {
      title: "Review scheduled",
      subtitle: "6h ago",
      branch: "tomorrow",
      variant: "success" as const,
    },
    {
      title: "Weak spot found",
      subtitle: "7h ago",
      branch: "revisit",
      variant: "warning" as const,
    },
    {
      title: "Answer saved",
      subtitle: "8h ago",
      branch: "markdown",
      variant: "success" as const,
    },
    {
      title: "Paper passage",
      subtitle: "9h ago",
      branch: "cited",
      variant: "default" as const,
    },
  ];

  const extendedCards = [...deployCards, ...deployCards, ...deployCards];

  const cardHeight = 64;
  const gap = 4;
  const itemHeight = cardHeight + gap;
  const offset = (containerHeight - cardHeight) / 2;

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      setContainerHeight(height);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const y = useMotionValue(0);
  const totalHeight = extendedCards.length * itemHeight;

  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();
    const speed = 30;

    function animateScroll(now: number) {
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;
      let current = y.get();
      current -= speed * elapsed;

      if (Math.abs(current) >= totalHeight / 3) {
        current += totalHeight / 3;
      }
      y.set(current);
      animationFrame = requestAnimationFrame(animateScroll);
    }
    animationFrame = requestAnimationFrame(animateScroll);
    return () => cancelAnimationFrame(animationFrame);
  }, [y, totalHeight]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      ref={containerRef}
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
      }}
    >
      <motion.div
        className="absolute left-1/2 flex w-full -translate-x-1/2 flex-col items-center"
        style={{ y }}
      >
        {extendedCards.map((card, index) => (
          <ScrollingDeployCard
            branch={card.branch}
            index={index}
            itemHeight={itemHeight}
            key={`${card.title}-${Math.floor(index / deployCards.length)}`}
            offset={offset}
            subtitle={card.subtitle}
            title={card.title}
            variant={card.variant}
            y={y}
          />
        ))}
      </motion.div>
    </div>
  );
};

const DeployCard = ({
  variant = "default",
  title,
  subtitle,
  branch,
}: {
  variant?: "default" | "danger" | "success" | "warning";
  title: string;
  subtitle: string;
  branch: string;
}) => {
  return (
    <div className="mx-auto flex w-full max-w-sm items-center justify-between rounded-lg p-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md",
            variant === "default" && "bg-blue-100",
            variant === "danger" && "bg-red-200",
            variant === "success" && "bg-green-200",
            variant === "warning" && "bg-yellow-200",
          )}
        >
          <StudyToken
            label={
              variant === "danger"
                ? "Gap"
                : variant === "warning"
                  ? "SRS"
                  : variant === "success"
                    ? "MD"
                    : "PDF"
            }
            className={cn(
              "size-5 border-0 bg-transparent text-[8px]",
              variant === "default" && "text-blue-500",
              variant === "danger" && "text-red-500",
              variant === "success" && "text-green-600",
              variant === "warning" && "text-yellow-600",
            )}
          />
        </div>
        <span className="text-charcoal-700 text-xs font-medium sm:text-sm">
          {title}
        </span>
      </div>
      <div className="ml-2 flex flex-row items-center gap-2">
        <span className="text-charcoal-700 text-xs font-normal">
          {subtitle}
        </span>
        <div className="size-1 rounded-full bg-gray-400"></div>
        <span className="text-charcoal-700 text-xs font-normal">{branch}</span>
      </div>
    </div>
  );
};

const LeftSVG = (props: React.SVGProps<SVGSVGElement>) => {
  const path = `M127.457 0.0891113L127.576 95.9138L127.457 0.0891113ZM-0.0609919 96.0731L-0.160632 16.2484C-0.172351 6.85959 7.4293 -0.761068 16.8181 -0.772787L16.8206 1.22721C8.53637 1.23755 1.82903 7.96166 1.83937 16.2459L1.93901 96.0706L-0.0609919 96.0731ZM-0.160632 16.2484C-0.172351 6.85959 7.4293 -0.761068 16.8181 -0.772787L127.455 -0.910888L127.458 1.08911L16.8206 1.22721C8.53637 1.23755 1.82903 7.96166 1.83937 16.2459L-0.160632 16.2484ZM127.576 95.9138L0.939007 96.0718L127.576 95.9138Z`;
  return (
    <motion.svg
      width="128"
      height="97"
      viewBox="0 0 128 97"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 1,
      }}
      className={props.className}
    >
      <mask id="path-1-inside-1_557_1106" fill="var(--color-line)">
        <path d="M127.457 0.0891113L127.576 95.9138L0.939007 96.0718L0.839368 16.2472C0.828338 7.41063 7.98283 0.238242 16.8194 0.227212L127.457 0.0891113Z" />
      </mask>
      <path
        d="M127.457 0.0891113L127.576 95.9138L127.457 0.0891113ZM-0.0609919 96.0731L-0.160632 16.2484C-0.172351 6.85959 7.4293 -0.761068 16.8181 -0.772787L16.8206 1.22721C8.53637 1.23755 1.82903 7.96166 1.83937 16.2459L1.93901 96.0706L-0.0609919 96.0731ZM-0.160632 16.2484C-0.172351 6.85959 7.4293 -0.761068 16.8181 -0.772787L127.455 -0.910888L127.458 1.08911L16.8206 1.22721C8.53637 1.23755 1.82903 7.96166 1.83937 16.2459L-0.160632 16.2484ZM127.576 95.9138L0.939007 96.0718L127.576 95.9138Z"
        fill="#EAEDF1"
        mask="url(#path-1-inside-1_557_1106)"
      />
      <path
        d="M127.457 0.0891113L127.576 95.9138L127.457 0.0891113ZM-0.0609919 96.0731L-0.160632 16.2484C-0.172351 6.85959 7.4293 -0.761068 16.8181 -0.772787L16.8206 1.22721C8.53637 1.23755 1.82903 7.96166 1.83937 16.2459L1.93901 96.0706L-0.0609919 96.0731ZM-0.160632 16.2484C-0.172351 6.85959 7.4293 -0.761068 16.8181 -0.772787L127.455 -0.910888L127.458 1.08911L16.8206 1.22721C8.53637 1.23755 1.82903 7.96166 1.83937 16.2459L-0.160632 16.2484ZM127.576 95.9138L0.939007 96.0718L127.576 95.9138Z"
        fill="url(#gradient-one)"
        mask="url(#path-1-inside-1_557_1106)"
      />
      {/* <rect d={path} width="128" height="97" fill="url(#gradient-one)" /> */}
      <defs>
        <motion.linearGradient
          id="gradient-one"
          initial={{
            x1: "100%",
            x2: "90%",
            y1: "90%",
            y2: "80%",
          }}
          animate={{
            x1: "20%",
            x2: "0%",
            y1: "90%",
            y2: "220%",
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatDelay: 2,
          }}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-line)" stopOpacity="0.5" offset="0" />
          <stop stopColor="#5787FF" stopOpacity="1" offset="0.5" />
          <stop stopColor="var(--color-line)" stopOpacity="0" offset="1" />
        </motion.linearGradient>
      </defs>
    </motion.svg>
  );
};

const RightSVG = (props: React.SVGProps<SVGSVGElement>) => {
  const PATH = `M0.619629 0L0.500018 95.8247L0.619629 0ZM128.137 95.984L128.237 16.1593C128.249 6.77047 120.647 -0.850179 111.258 -0.861898L111.256 1.1381C119.54 1.14844 126.247 7.87255 126.237 16.1568L126.137 95.9815L128.137 95.984ZM128.237 16.1593C128.249 6.77047 120.647 -0.850179 111.258 -0.861898L0.620877 -0.999999L0.618381 0.999999L111.256 1.1381C119.54 1.14844 126.247 7.87255 126.237 16.1568L128.237 16.1593ZM0.500018 95.8247L127.137 95.9827L0.500018 95.8247Z`;
  return (
    <motion.svg
      width="128"
      height="96"
      viewBox="0 0 128 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 1,
      }}
      className={props.className}
    >
      <mask id="path-1-inside-1_557_1107" fill="var(--color-line)">
        <path d="M0.619629 0L0.500018 95.8247L127.137 95.9827L127.237 16.1581C127.248 7.32152 120.093 0.149131 111.257 0.138101L0.619629 0Z" />
      </mask>
      <path
        d="M0.619629 0L0.500018 95.8247L0.619629 0ZM128.137 95.984L128.237 16.1593C128.249 6.77047 120.647 -0.850179 111.258 -0.861898L111.256 1.1381C119.54 1.14844 126.247 7.87255 126.237 16.1568L126.137 95.9815L128.137 95.984ZM128.237 16.1593C128.249 6.77047 120.647 -0.850179 111.258 -0.861898L0.620877 -0.999999L0.618381 0.999999L111.256 1.1381C119.54 1.14844 126.247 7.87255 126.237 16.1568L128.237 16.1593ZM0.500018 95.8247L127.137 95.9827L0.500018 95.8247Z"
        fill="#EAEDF1"
        mask="url(#path-1-inside-1_557_1107)"
      />
      <path
        d="M0.619629 0L0.500018 95.8247L0.619629 0ZM128.137 95.984L128.237 16.1593C128.249 6.77047 120.647 -0.850179 111.258 -0.861898L111.256 1.1381C119.54 1.14844 126.247 7.87255 126.237 16.1568L126.137 95.9815L128.137 95.984ZM128.237 16.1593C128.249 6.77047 120.647 -0.850179 111.258 -0.861898L0.620877 -0.999999L0.618381 0.999999L111.256 1.1381C119.54 1.14844 126.247 7.87255 126.237 16.1568L128.237 16.1593ZM0.500018 95.8247L127.137 95.9827L0.500018 95.8247Z"
        fill="url(#gradient-two)"
        mask="url(#path-1-inside-1_557_1107)"
      />
      {/* <rect d={PATH} width="128" height="97" fill="url(#gradient-two)" /> */}

      <defs>
        <motion.linearGradient
          id="gradient-two"
          initial={{
            x1: "-10%",
            x2: "0%",
            y1: "0%",
            y2: "0%",
          }}
          animate={{
            x1: "100%",
            x2: "110%",
            y1: "110%",
            y2: "140%",
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatDelay: 2,
          }}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.5" offset="0" />
          <stop stopColor="var(--color-brand)" stopOpacity="1" offset="0.5" />
          <stop stopColor="white" stopOpacity="0" offset="1" />
        </motion.linearGradient>
      </defs>
    </motion.svg>
  );
};

const CenterSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <motion.svg
      width="2"
      height="56"
      viewBox="0 0 2 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 1,
      }}
      className={props.className}
    >
      <line x1="1" y1="56" x2="1" stroke="var(--color-line)" strokeWidth="2" />
      <line
        x1="1"
        y1="56"
        x2="1"
        stroke="url(#gradient-three)"
        strokeWidth="1"
      />
      <defs>
        <motion.linearGradient
          id="gradient-three"
          initial={{
            x1: "0%",
            x2: "0%",
            y1: "-100%",
            y2: "-90%",
          }}
          animate={{
            x1: "0%",
            x2: "0%",
            y1: "90%",
            y2: "100%",
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatDelay: 2,
          }}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--color-line)" stopOpacity="1" offset="0" />
          <stop stopColor="var(--color-brand)" stopOpacity="0.5" offset="0.5" />
          <stop stopColor="var(--color-brand)" stopOpacity="0" offset="1" />
        </motion.linearGradient>
      </defs>
    </motion.svg>
  );
};
