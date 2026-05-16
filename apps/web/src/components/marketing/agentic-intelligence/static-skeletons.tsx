import { cn } from "@avenire/ui/lib/utils";
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
import type React from "react";
import { IconBlock } from "../common/icon-block";
import { DivideX } from "../divide";
import { IntegrationsLogo } from "../icons/bento-icons";
import { LogoSVG } from "../logo";

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

const makeStudyToken =
  (label: string) =>
  ({ className }: React.SVGProps<SVGSVGElement>) => (
    <StudyToken className={className} label={label} />
  );

const MODEL_ROW_SCANS = ["0s", "0.35s", "0.7s"] as const;

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
    <div className="relative mx-auto mt-20 h-full max-h-70 min-h-40 w-[85%] rounded-2xl border border-gray-300 border-t bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800">
      <div className="absolute -top-10 -right-10 z-20 flex w-40 shrink-0 flex-col items-start rounded-lg bg-white text-xs shadow-aceternity dark:bg-neutral-900">
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
      </div>
      <div className="mb-4 flex gap-2">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </div>
      <div className="mt-12 flex items-center gap-2">
        <IntegrationsLogo />
        <span className="font-medium text-charcoal-700 text-sm dark:text-neutral-200">
          Study modes
        </span>
        <span className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-charcoal-700 text-xs dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200">
          3
        </span>
      </div>
      <DivideX className="mt-2" />
      {models.map((model, index) => (
        <div className="relative mt-4 overflow-hidden" key={model.name}>
          <div
            className="pointer-events-none absolute inset-y-0 left-[-30%] w-24 bg-gradient-to-r from-transparent via-brand/25 to-transparent [animation:avenire-skeleton-scan_2.4s_ease-in-out_infinite]"
            style={{ animationDelay: MODEL_ROW_SCANS[index] }}
          />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <model.logo className="h-4 w-4 shrink-0" />
              <span className="font-medium text-charcoal-700 text-sm dark:text-neutral-200">
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
                  "border-red-500 bg-red-50 text-red-500 dark:bg-red-50/10"
              )}
            >
              {model.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const NativeToolsIntegrationSkeleton = () => {
  return (
    <div className="relative mx-auto my-12 hidden h-full max-h-70 min-h-80 max-w-[67rem] grid-cols-2 p-4 lg:grid">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-10">
          <TextIconBlock icon={<StudyToken label="PDF" />} text="Source search">
            <TopSVG className="absolute top-2 -right-84" />
          </TextIconBlock>
          <TextIconBlock icon={<StudyToken label="MD" />} text="Markdown notes">
            <MiddleSVG className="absolute top-2 -right-84" />
          </TextIconBlock>
          <TextIconBlock icon={<StudyToken label="SRS" />} text="Review cards">
            <BottomSVG className="absolute -right-84 bottom-2" />
          </TextIconBlock>
        </div>
        <div className="relative h-14 w-14 overflow-hidden rounded-md border border-brand/35 bg-gray-200 p-px shadow-xl dark:bg-neutral-700">
          <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic [animation-duration:2s] [background-image:conic-gradient(at_center,transparent,var(--color-brand)_20%,transparent_30%)]" />
          <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full [animation-delay:1s] [animation-duration:2s] [background-image:conic-gradient(at_center,transparent,var(--color-brand)_20%,transparent_30%)]" />
          <div className="relative z-20 flex h-full w-full items-center justify-center rounded-[5px] bg-white dark:bg-neutral-900">
            <LogoSVG className="size-8 text-black dark:text-white" />
          </div>
        </div>
      </div>
      <div className="relative flex h-full w-full items-center justify-start">
        <RightSideSVG />
        <div className="relative flex flex-col items-center gap-2">
          <span className="relative z-20 rounded-sm border border-brand/70 bg-brand/10 px-2 py-0.5 text-brand text-xs">
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
    </div>
  );
};

const VerticalLine = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className="shrink-0"
      fill="none"
      height="81"
      viewBox="0 0 1 81"
      width="1"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        stroke="var(--color-line)"
        transform="matrix(0 -1 -1 0 0 80.5)"
        x2="80"
        y1="-0.5"
        y2="-0.5"
      />
      <line
        stroke="url(#vertical-line-gradient)"
        transform="matrix(0 -1 -1 0 0 80.5)"
        x2="80"
        y1="-0.5"
        y2="-0.5"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="vertical-line-gradient"
          x1="0"
          x2="2"
          y1="64"
          y2="80"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.5" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const RightSideSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      fill="none"
      height="2"
      viewBox="0 0 314 2"
      width="314"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        stroke="var(--color-line)"
        strokeLinecap="round"
        x1="0.5"
        x2="313.5"
        y1="1"
        y2="1"
      />
      <line
        stroke="url(#horizontal-line-gradient)"
        strokeLinecap="round"
        x1="0.5"
        x2="313.5"
        y1="1"
        y2="1"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="horizontal-line-gradient"
          x1="250"
          x2="314"
          y1="0"
          y2="1"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.5" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const TopSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      fill="none"
      height="33"
      viewBox="0 0 312 33"
      width="312"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        stroke="var(--color-line)"
        strokeLinecap="round"
        x1="0.5"
        x2="311.5"
        y1="1"
        y2="1"
      />
      <line
        stroke="var(--color-line)"
        strokeLinecap="round"
        x1="311.5"
        x2="311.5"
        y1="1"
        y2="32"
      />

      <line
        stroke="url(#line-one-gradient)"
        strokeLinecap="round"
        x1="0.5"
        x2="311.5"
        y1="1"
        y2="1"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="line-one-gradient"
          x1="240"
          x2="312"
          y1="1"
          y2="0"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-brand)" />
          <stop offset="0.66" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const MiddleSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      fill="none"
      height="2"
      viewBox="0 0 323 2"
      width="323"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line
        stroke="var(--color-line)"
        strokeLinecap="round"
        x1="0.5"
        x2="322.5"
        y1="1"
        y2="1"
      />
      <line
        stroke="url(#line-two-gradient)"
        strokeLinecap="round"
        x1="0.5"
        x2="322.5"
        y1="1"
        y2="1"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="line-two-gradient"
          x1="250"
          x2="323"
          y1="1"
          y2="0"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-brand)" />
          <stop offset="0.66" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const BottomSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      fill="none"
      height="32"
      viewBox="0 0 326 32"
      width="326"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line stroke="var(--color-line)" x2="325" y1="31" y2="31" />

      <line
        stroke="var(--color-line)"
        strokeLinecap="round"
        x1="325.5"
        x2="325.5"
        y1="31"
        y2="1"
      />
      <line stroke="url(#line-three-gradient)" x2="325" y1="31" y2="31" />

      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="line-three-gradient"
          x1="250"
          x2="326"
          y1="1"
          y2="0"
        >
          <stop stopColor="var(--color-line)" />
          <stop offset="0.33" stopColor="var(--color-yellow-500)" />
          <stop offset="0.66" stopColor="var(--color-yellow-500)" />
          <stop offset="1" stopColor="var(--color-line)" />
        </linearGradient>
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
      <span className="font-medium text-charcoal-700 text-sm dark:text-neutral-200">
        {text}
      </span>
      {children}
    </div>
  );
};
