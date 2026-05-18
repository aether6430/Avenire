"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@avenire/ui/components/sheet";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon, HamburgerIcon } from "@/components/marketing/icons/general";
import { Button } from "./button";
import { Logo } from "./logo";

interface MarketingNavItem {
  href: string;
  title: string;
}

export function MobileNav({ items }: { items: MarketingNavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div aria-hidden="true" className="h-16 md:hidden" />
      <div className="fixed inset-x-3 top-3 z-50 md:hidden">
        <div className="flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-neutral-950/88 px-3 py-1 shadow-[0_14px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <Logo />
          <Sheet onOpenChange={setIsOpen} open={isOpen}>
            <SheetTrigger
              render={
                <button
                  aria-label="Open menu"
                  className="flex size-10 items-center justify-center text-brand transition-colors hover:text-white"
                />
              }
            >
              <HamburgerIcon className="size-5 shrink-0" />
            </SheetTrigger>
            <SheetContent
              className="avenire-marketing-scope dark inset-x-0 top-0 h-auto max-h-dvh w-screen max-w-none overflow-hidden rounded-b-[1.5rem] border-white/10 border-x-0 border-t-0 bg-neutral-950 p-0 text-neutral-100 shadow-2xl shadow-black/70"
              showCloseButton={false}
              side="top"
            >
              <div className="absolute inset-0 bg-[repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:12px_12px] opacity-25" />
              <div className="relative z-10 flex max-h-dvh flex-col">
                <SheetHeader className="flex-row items-center justify-between border-white/10 border-b px-4 py-2.5">
                  <div>
                    <Logo />
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <SheetDescription className="sr-only">
                      Avenire landing page navigation
                    </SheetDescription>
                  </div>
                  <SheetClose
                    render={
                      <button
                        aria-label="Close menu"
                        className="flex size-10 items-center justify-center text-brand transition-colors hover:text-white"
                      />
                    }
                  >
                    <CloseIcon className="size-5 shrink-0" />
                  </SheetClose>
                </SheetHeader>

                <div className="flex flex-1 flex-col overflow-y-auto px-5 py-2">
                  <div className="divide-y divide-white/10 border-white/10 border-y">
                    {items.map((item) => (
                      <SheetClose
                        key={item.title}
                        nativeButton={false}
                        render={
                          <Link
                            className="block py-3 font-medium text-base text-white/88 transition-colors hover:text-brand"
                            href={item.href as any}
                          />
                        }
                      >
                        {item.title}
                      </SheetClose>
                    ))}
                  </div>
                </div>

                <SheetFooter className="grid grid-cols-2 gap-2 border-white/10 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-center font-medium text-sm text-white transition-colors hover:border-brand/45 hover:bg-brand/10"
                        href="/login"
                      />
                    }
                  >
                    Log in
                  </SheetClose>
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        className="rounded-2xl bg-brand px-4 py-2.5 text-center font-medium text-[#1b2733] text-sm transition-colors hover:bg-brand/90"
                        href="/waitlist"
                      />
                    }
                  >
                    Join waitlist
                  </SheetClose>
                </SheetFooter>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}

export function FloatingNav({ items }: { items: MarketingNavItem[] }) {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const updateCompactState = () => setIsCompact(window.scrollY > 28);

    updateCompactState();
    window.addEventListener("scroll", updateCompactState, { passive: true });

    return () => window.removeEventListener("scroll", updateCompactState);
  }, []);

  return (
    <>
      <div aria-hidden="true" className="hidden h-[4.55rem] md:block" />
      <div
        className={[
          "fixed inset-x-6 top-3 z-50 mx-auto hidden grid-cols-[1fr_auto_1fr] items-center border border-white/10 shadow-aceternity backdrop-blur-xl transition-all duration-200 ease-out md:grid",
          isCompact
            ? "max-w-[66rem] rounded-[1.85rem] bg-neutral-950/92 px-5 py-1.5"
            : "max-w-[72rem] rounded-[1.55rem] bg-neutral-950/82 px-5 py-2.5",
        ].join(" ")}
      >
        <div className="justify-self-start">
          <Logo />
        </div>
        <div
          className={[
            "flex items-center justify-self-center transition-all duration-200",
            isCompact ? "gap-7" : "gap-8",
          ].join(" ")}
        >
          {items.map((item) => (
            <Link
              className="font-medium text-[15px] text-white/70 transition duration-200 hover:text-white"
              href={item.href as any}
              key={item.title}
            >
              {item.title}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 justify-self-end">
          <Button
            as={Link}
            className="px-5 py-2 text-sm"
            href="/login"
            variant="secondary"
          >
            Log in
          </Button>
          <Button as={Link} className="px-5 py-2 text-sm" href="/waitlist">
            Join waitlist
          </Button>
        </div>
      </div>
    </>
  );
}
