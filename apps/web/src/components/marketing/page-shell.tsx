import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DivideX } from "./divide";
import { Footer } from "./footer";
import { Navbar } from "./navbar";

export function MarketingPageShell({
  children,
  mainClassName,
  showDividerAfterNav = false,
}: {
  children: ReactNode;
  mainClassName?: string;
  showDividerAfterNav?: boolean;
}) {
  return (
    <main
      className={cn(
        "avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100",
        mainClassName
      )}
    >
      <Navbar />
      {showDividerAfterNav ? <DivideX /> : null}
      {children}
      <Footer />
    </main>
  );
}

export function MarketingPageFrame({
  children,
  contentClassName,
  frameClassName,
  sectionClassName,
}: {
  children: ReactNode;
  contentClassName?: string;
  frameClassName?: string;
  sectionClassName?: string;
}) {
  return (
    <section className={cn("px-4 pt-32 pb-24", sectionClassName)}>
      <div
        className={cn(
          "mx-auto max-w-[72rem] border-divide border-x border-y px-4 py-8 md:px-8",
          frameClassName
        )}
      >
        <div className={cn("mx-auto max-w-[56rem]", contentClassName)}>
          {children}
        </div>
      </div>
    </section>
  );
}
