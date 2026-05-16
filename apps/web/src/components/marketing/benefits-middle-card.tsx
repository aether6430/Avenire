import { BellIcon, Cards, FilePdf } from "@phosphor-icons/react";
import { IconBlock } from "./common/icon-block";
import { DivideX } from "./divide";
import { LogoSVG } from "./logo";

export function BenefitsMiddleCard() {
  const texts = ["Misconception logged", "Mindset ready", "Context synced"];
  const progressItems = [
    { label: "Sources linked", width: "86%", delay: "0.4s" },
    { label: "Notes updated", width: "74%", delay: "0.5s" },
    { label: "Review due", width: "58%", delay: "0.6s" },
  ] as const;

  return (
    <div className="relative flex min-h-40 flex-col justify-end overflow-hidden rounded-lg border border-white/8 bg-gray-50 p-4 md:p-5 dark:bg-neutral-900">
      <div className="mask-radial-from-10% absolute inset-0 bg-[repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:12px_12px] opacity-55 shadow-xl" />

      <div className="flex items-center justify-center">
        <IconBlock
          className="border-brand/20 bg-neutral-950"
          icon={<FilePdf className="size-6 text-brand" weight="duotone" />}
        />
        <GradientHorizontalLine />
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-brand/40 bg-gray-200 p-px shadow-xl dark:bg-neutral-700">
          <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic [animation-duration:2s] [background-image:conic-gradient(at_center,transparent,var(--color-brand)_20%,transparent_30%)]" />
          <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic via-brand [animation-delay:1s] [animation-duration:2s] [background-image:conic-gradient(at_center,transparent,var(--color-brand)_20%,transparent_30%)]" />
          <div className="relative z-20 flex h-full w-full items-center justify-center rounded-[5px] bg-white dark:bg-neutral-900">
            <LogoSVG className="size-8 text-white" />
          </div>
        </div>
        <GradientHorizontalLine />
        <IconBlock
          className="border-brand/20 bg-neutral-950"
          icon={<Cards className="size-6 text-brand" weight="duotone" />}
        />
      </div>
      <div className="relative z-20 flex flex-col items-center justify-center">
        <GradientVerticalLine />
        <div className="rounded-sm border border-brand/70 bg-brand/15 px-2 py-0.5 text-brand text-xs dark:text-brand">
          Connected
        </div>
      </div>
      <div className="h-60 w-full translate-x-10 translate-y-10 overflow-hidden rounded-md bg-gray-200 p-px shadow-xl dark:bg-neutral-700">
        <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic from-transparent via-20% via-brand to-30% to-transparent blur-2xl [animation-duration:4s]" />
        <div className="absolute inset-0 scale-[1.4] animate-spin rounded-full bg-conic from-transparent via-20% via-brand to-30% to-transparent blur-2xl [animation-delay:2s] [animation-duration:4s]" />
        <div className="relative z-20 h-full w-full rounded-[5px] bg-white dark:bg-neutral-900">
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:12px_12px] opacity-35" />
          <div className="flex items-center justify-between p-4">
            <div className="flex gap-1">
              <div className="size-2 rounded-full bg-red-400" />
              <div className="size-2 rounded-full bg-yellow-400" />
              <div className="size-2 rounded-full bg-green-400" />
            </div>
            <div className="relative mr-2 h-6 w-40 overflow-hidden">
              {texts.map((text, index) => (
                <div
                  className="absolute inset-0 flex items-center gap-1 rounded-sm bg-white px-2 py-1 text-neutral-500 text-xs opacity-0 shadow-aceternity [animation:avenire-toast-cycle_12s_linear_infinite] dark:bg-neutral-700 dark:text-white"
                  key={text}
                  style={{ animationDelay: `${index * 4}s` }}
                >
                  <BellIcon className="size-3" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <DivideX />
          <div className="flex h-full flex-row">
            <div className="h-full w-14 bg-gray-200 dark:bg-neutral-800" />
            <div className="relative w-full gap-y-4 p-4">
              <h2 className="font-semibold text-gray-800 text-sm dark:text-neutral-300">
                Study loop
              </h2>

              <div className="mask-b-from-50% mt-4 flex flex-col gap-y-3">
                {progressItems.map((item) => (
                  <div className="space-y-1" key={item.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{item.label}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-brand/75 [animation:avenire-progress-reveal_1.2s_ease-out_both]"
                        style={{
                          width: item.width,
                          animationDelay: item.delay,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const GradientHorizontalLine = () => {
  return (
    <div
      className="h-px w-20 shrink-0"
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--color-line) 0%, var(--color-brand) 50%, var(--color-line) 100%)",
      }}
    />
  );
};

const GradientVerticalLine = () => {
  return (
    <div
      className="h-20 w-px shrink-0"
      style={{
        backgroundImage:
          "linear-gradient(180deg, var(--color-line) 0%, var(--color-brand) 50%, var(--color-line) 100%)",
      }}
    />
  );
};
