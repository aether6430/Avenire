"use client";

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
import {
  type MotionValue,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IntegrationsLogo } from "@/components/marketing/icons/bento-icons";
import { cn } from "@/lib/utils";
import { DivideX } from "../divide";
import { LogoSVG } from "../logo";
import { Scale } from "../scale";
import { Card } from "../tech-card";

function buildOccurrenceKeys(
  items: readonly string[],
  toBaseKey: (item: string) => string
) {
  const seenKeys = new Map<string, number>();
  return items.map((item) => {
    const baseKey = toBaseKey(item);
    const occurrence = seenKeys.get(baseKey) ?? 0;
    seenKeys.set(baseKey, occurrence + 1);
    return occurrence === 0 ? baseKey : `${baseKey}-${occurrence}`;
  });
}

interface DeployCardInfo {
  branch: string;
  instanceKey?: string;
  subtitle: string;
  title: string;
  variant?: "default" | "danger" | "success" | "warning";
}

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
      <FilePdf className={iconClassName} weight="duotone" />
    ) : normalizedLabel === "md" ? (
      <MarkdownLogo className={iconClassName} weight="duotone" />
    ) : normalizedLabel === "cards" || normalizedLabel === "srs" ? (
      <Cards className={iconClassName} weight="duotone" />
    ) : normalizedLabel === "graph" ? (
      <Graph className={iconClassName} weight="duotone" />
    ) : normalizedLabel === "files" ? (
      <Files className={iconClassName} weight="duotone" />
    ) : normalizedLabel === "gap" ? (
      <WarningDiamond className={iconClassName} weight="duotone" />
    ) : normalizedLabel === "q" ? (
      <Question className={iconClassName} weight="duotone" />
    ) : normalizedLabel === "ai" ? (
      <Sparkle className={iconClassName} weight="duotone" />
    ) : (
      <Brain className={iconClassName} weight="duotone" />
    );

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-sm border border-brand/25 bg-brand/10 text-brand",
        className
      )}
      role="img"
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
          cta="Indexed"
          logo={<StudyToken label="PDF" />}
          subtitle="resnet.pdf"
          title="Source files"
          tone="default"
        />
        <LeftSVG className="absolute top-12 -left-32" />
        <RightSVG className="absolute top-12 -right-32" />
        <CenterSVG className="absolute top-24 right-[107px]" />
      </div>

      <div className="mt-12 flex flex-row gap-4.5">
        <Card
          cta="Logged"
          delay={0.2}
          logo={<StudyToken label="Gap" />}
          subtitle="gradient flow"
          title="Misconception"
          tone="danger"
        />
        <Card
          cta="Saved"
          delay={0.4}
          logo={<StudyToken label="MD" />}
          subtitle="ResNet"
          title="Markdown note"
          tone="default"
        />
        <Card
          cta="Ready"
          delay={0.6}
          logo={<StudyToken label="SRS" />}
          subtitle="12 cards"
          title="Review queue"
          tone="success"
        />
      </div>
    </div>
  );
};

export const ConnectYourTooklsSkeleton = () => {
  const text =
    "Explain why residual shortcuts reduce degradation in deep networks.";
  const [mounted, setMounted] = useState(false);
  const sessionBarWidths = useMemo(() => [58, 42], []);
  const toolBarWidths = useMemo(() => [54, 36, 28], []);
  const textSegments = text.split(/(\s+)/);
  const textSegmentKeys = useMemo(
    () =>
      buildOccurrenceKeys(textSegments, (segment) =>
        segment === " " ? "space" : segment
      ),
    [textSegments]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 px-3 sm:flex-row sm:gap-8 sm:px-8">
      <motion.div
        animate={{ y: 0, opacity: 1 }}
        className="relative h-36 w-72 overflow-hidden rounded-2xl border border-brand/18 bg-[#151f31]/98 p-3 shadow-2xl shadow-black/45 sm:h-64 sm:w-52 sm:p-4"
        initial={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute top-3 right-3 flex size-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] shadow-black/25 shadow-lg sm:size-10">
          <Scale className="bg-neutral-900/80 dark:bg-neutral-900/80" />
          <StudyToken className="relative z-20 size-6" label="AI" />
        </div>
        <div className="mt-2 flex items-center gap-2 pr-12 sm:mt-4">
          <IntegrationsLogo className="dark:text-neutral-200" />
          <span className="font-medium text-white/86 text-xs sm:text-sm">
            Tasks
          </span>
        </div>
        <DivideX className="mt-2" />

        <div className="mt-3 flex items-center justify-between gap-2 sm:mt-4">
          <div className="flex items-center gap-2">
            <span className="font-normal text-[10px] text-charcoal-700 leading-loose md:text-xs dark:text-neutral-200">
              {textSegments.map((word, index) => (
                <motion.span
                  animate={{
                    opacity: 1,
                  }}
                  className="inline-block"
                  initial={{
                    opacity: 0,
                  }}
                  key={textSegmentKeys[index]}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.02,
                    ease: "linear",
                  }}
                >
                  {word === " " ? "\u00A0" : word}
                </motion.span>
              ))}
            </span>
          </div>
        </div>
        <div className="mt-2 hidden max-w-full flex-col overflow-hidden sm:flex">
          {sessionBarWidths.map((width, index) => (
            <motion.div
              animate={{
                width: `${width}%`,
              }}
              className="mt-2 h-2.5 rounded-full bg-white/8"
              initial={{
                width: "14%",
              }}
              key={`session-bar-${width}`}
              transition={{
                duration: 4,
                delay: index * 0.2,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        animate={{ opacity: 1 }}
        className="pointer-events-none absolute inset-x-0 z-30 hidden items-center justify-center md:flex"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
      >
        <div className="size-2.5 rounded-full border border-brand/70 bg-neutral-950 shadow-[0_0_14px_rgba(171,196,255,0.35)]" />
        <div className="h-px w-12 bg-gradient-to-r from-transparent via-brand/35 to-transparent" />
        <div className="size-2.5 rounded-full border border-brand/70 bg-neutral-950 shadow-[0_0_14px_rgba(171,196,255,0.35)]" />
      </motion.div>
      <motion.div
        animate={{ y: 0, opacity: 1 }}
        className="relative h-36 w-72 overflow-hidden rounded-2xl border border-brand/18 bg-[#151f31]/98 p-3 shadow-2xl shadow-black/45 sm:h-64 sm:w-52 sm:p-4"
        initial={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <div className="absolute top-3 right-3 flex size-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] shadow-black/25 shadow-lg sm:size-10">
          <Scale className="bg-neutral-900/80 dark:bg-neutral-900/80" />
          <LogoSVG className="relative z-20 size-5 text-brand sm:size-6" />
        </div>
        <div className="mt-2 flex items-center gap-2 pr-12 sm:mt-4">
          <IntegrationsLogo className="dark:text-neutral-200" />
          <span className="font-medium text-white/86 text-xs md:text-sm">
            Learning tools
          </span>
          <span className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-charcoal-700 text-xs dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
            4
          </span>
        </div>
        <DivideX className="mt-2" />
        <div className="mt-3 flex items-center justify-between gap-2 sm:mt-4">
          <div className="flex items-center gap-2">
            <StudyToken label="PDF" />
            <span className="font-medium text-charcoal-700 text-xs md:text-sm dark:text-neutral-200">
              Source search
            </span>
          </div>

          <div className="rounded-sm border border-brand/70 bg-brand/10 px-2 py-0.5 text-brand text-xs">
            Connected
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 sm:mt-4">
          <div className="flex items-center gap-2">
            <StudyToken label="SRS" />
            <span className="font-medium text-charcoal-700 text-xs md:text-sm dark:text-neutral-200">
              Spaced review
            </span>
          </div>

          <div className="rounded-sm border border-brand/70 bg-brand/10 px-2 py-0.5 text-brand text-xs">
            Connected
          </div>
        </div>
        <div className="mt-2 hidden max-w-full flex-col overflow-hidden sm:flex">
          {toolBarWidths.map((width, index) => (
            <motion.div
              animate={{
                width: `${width}%`,
              }}
              className="mt-2 h-2.5 rounded-full bg-white/8"
              initial={{
                width: "16%",
              }}
              key={`tool-bar-${width}`}
              transition={{
                duration: 4,
                delay: index * 0.2,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export const DeployAndScaleSkeleton = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const deployCards: DeployCardInfo[] = [
    { title: "Residual block note", subtitle: "2h ago", branch: "markdown" },
    {
      title: "Shortcut connection",
      subtitle: "10m ago",
      branch: "misconception",
      variant: "success",
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
      variant: "warning",
    },
    {
      title: "Training depth",
      subtitle: "3h ago",
      branch: "note",
      variant: "success",
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
      variant: "default",
    },
  ];
  const extendedCards = Array.from({ length: 3 }, (_, cycleIndex) =>
    deployCards.map((card) => ({
      ...card,
      instanceKey: `${card.title}-${cycleIndex}`,
    }))
  ).flat();

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
          <AnimatedDeployCard
            card={card}
            cardIndex={index}
            itemHeight={itemHeight}
            key={card.instanceKey}
            offset={offset}
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
            variant === "warning" && "bg-yellow-200"
          )}
        >
          <StudyToken
            className={cn(
              "size-5 border-0 bg-transparent text-[8px]",
              variant === "default" && "text-blue-500",
              variant === "danger" && "text-red-500",
              variant === "success" && "text-green-600",
              variant === "warning" && "text-yellow-600"
            )}
            label={
              variant === "danger"
                ? "Gap"
                : variant === "warning"
                  ? "SRS"
                  : variant === "success"
                    ? "MD"
                    : "PDF"
            }
          />
        </div>
        <span className="font-medium text-charcoal-700 text-xs sm:text-sm">
          {title}
        </span>
      </div>
      <div className="ml-2 flex flex-row items-center gap-2">
        <span className="font-normal text-charcoal-700 text-xs">
          {subtitle}
        </span>
        <div className="size-1 rounded-full bg-gray-400" />
        <span className="font-normal text-charcoal-700 text-xs">{branch}</span>
      </div>
    </div>
  );
};

const AnimatedDeployCard = ({
  card,
  cardIndex,
  itemHeight,
  offset,
  y,
}: {
  card: DeployCardInfo;
  cardIndex: number;
  itemHeight: number;
  offset: number;
  y: MotionValue<number>;
}) => {
  const scale = useTransform(
    y,
    [
      offset + (cardIndex - 2) * -itemHeight,
      offset + (cardIndex - 1) * -itemHeight,
      offset + cardIndex * -itemHeight,
      offset + (cardIndex + 1) * -itemHeight,
      offset + (cardIndex + 2) * -itemHeight,
    ],
    [0.85, 0.95, 1.1, 0.95, 0.85]
  );
  const background = useTransform(
    y,
    [
      offset + (cardIndex - 1) * -itemHeight,
      offset + cardIndex * -itemHeight,
      offset + (cardIndex + 1) * -itemHeight,
    ],
    ["#101114", "#abc4ff", "#101114"]
  );
  const borderColor = useTransform(
    y,
    [
      offset + (cardIndex - 1) * -itemHeight,
      offset + cardIndex * -itemHeight,
      offset + (cardIndex + 1) * -itemHeight,
    ],
    ["#101114", "#abc4ff", "#101114"]
  );

  return (
    <motion.div
      className="mx-auto mt-4 w-full max-w-sm shrink-0 rounded-2xl shadow-xl"
      style={{ background, borderColor, scale }}
    >
      <DeployCard
        branch={card.branch}
        subtitle={card.subtitle}
        title={card.title}
        variant={card.variant}
      />
    </motion.div>
  );
};

const LeftSVG = (props: React.SVGProps<SVGSVGElement>) => {
  const path =
    "M127.457 0.0891113L127.576 95.9138L127.457 0.0891113ZM-0.0609919 96.0731L-0.160632 16.2484C-0.172351 6.85959 7.4293 -0.761068 16.8181 -0.772787L16.8206 1.22721C8.53637 1.23755 1.82903 7.96166 1.83937 16.2459L1.93901 96.0706L-0.0609919 96.0731ZM-0.160632 16.2484C-0.172351 6.85959 7.4293 -0.761068 16.8181 -0.772787L127.455 -0.910888L127.458 1.08911L16.8206 1.22721C8.53637 1.23755 1.82903 7.96166 1.83937 16.2459L-0.160632 16.2484ZM127.576 95.9138L0.939007 96.0718L127.576 95.9138Z";
  return (
    <motion.svg
      animate={{
        opacity: 1,
      }}
      className={props.className}
      fill="none"
      height="97"
      initial={{
        opacity: 0,
      }}
      transition={{
        duration: 1,
      }}
      viewBox="0 0 128 97"
      width="128"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask fill="var(--color-line)" id="path-1-inside-1_557_1106">
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
          animate={{
            x1: "20%",
            x2: "0%",
            y1: "90%",
            y2: "220%",
          }}
          gradientUnits="userSpaceOnUse"
          id="gradient-one"
          initial={{
            x1: "100%",
            x2: "90%",
            y1: "90%",
            y2: "80%",
          }}
          transition={{
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 2,
          }}
        >
          <stop offset="0" stopColor="var(--color-line)" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#5787FF" stopOpacity="1" />
          <stop offset="1" stopColor="var(--color-line)" stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </motion.svg>
  );
};

const RightSVG = (props: React.SVGProps<SVGSVGElement>) => {
  const PATH =
    "M0.619629 0L0.500018 95.8247L0.619629 0ZM128.137 95.984L128.237 16.1593C128.249 6.77047 120.647 -0.850179 111.258 -0.861898L111.256 1.1381C119.54 1.14844 126.247 7.87255 126.237 16.1568L126.137 95.9815L128.137 95.984ZM128.237 16.1593C128.249 6.77047 120.647 -0.850179 111.258 -0.861898L0.620877 -0.999999L0.618381 0.999999L111.256 1.1381C119.54 1.14844 126.247 7.87255 126.237 16.1568L128.237 16.1593ZM0.500018 95.8247L127.137 95.9827L0.500018 95.8247Z";
  return (
    <motion.svg
      animate={{
        opacity: 1,
      }}
      className={props.className}
      fill="none"
      height="96"
      initial={{
        opacity: 0,
      }}
      transition={{
        duration: 1,
      }}
      viewBox="0 0 128 96"
      width="128"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask fill="var(--color-line)" id="path-1-inside-1_557_1107">
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
          animate={{
            x1: "100%",
            x2: "110%",
            y1: "110%",
            y2: "140%",
          }}
          gradientUnits="userSpaceOnUse"
          id="gradient-two"
          initial={{
            x1: "-10%",
            x2: "0%",
            y1: "0%",
            y2: "0%",
          }}
          transition={{
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 2,
          }}
        >
          <stop offset="0" stopColor="white" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="var(--color-brand)" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </motion.svg>
  );
};

const CenterSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <motion.svg
      animate={{
        opacity: 1,
      }}
      className={props.className}
      fill="none"
      height="56"
      initial={{
        opacity: 0,
      }}
      transition={{
        duration: 1,
      }}
      viewBox="0 0 2 56"
      width="2"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line stroke="var(--color-line)" strokeWidth="2" x1="1" x2="1" y1="56" />
      <line
        stroke="url(#gradient-three)"
        strokeWidth="1"
        x1="1"
        x2="1"
        y1="56"
      />
      <defs>
        <motion.linearGradient
          animate={{
            x1: "0%",
            x2: "0%",
            y1: "90%",
            y2: "100%",
          }}
          gradientUnits="userSpaceOnUse"
          id="gradient-three"
          initial={{
            x1: "0%",
            x2: "0%",
            y1: "-100%",
            y2: "-90%",
          }}
          transition={{
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 2,
          }}
        >
          <stop offset="0" stopColor="var(--color-line)" stopOpacity="1" />
          <stop offset="0.5" stopColor="var(--color-brand)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--color-brand)" stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </motion.svg>
  );
};
