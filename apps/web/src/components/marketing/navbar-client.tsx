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
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { CloseIcon, HamburgerIcon } from "@/components/marketing/icons/general";
import { Button } from "./button";
import { Logo } from "./logo";

interface MarketingNavItem {
  href: string;
  title: string;
}

export function MobileNav({ items }: { items: MarketingNavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const mobileItems = items.filter((item) => item.href !== "/pricing");

  return (
    <div className="fixed inset-x-3 top-3 z-50 md:hidden">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/88 p-3 shadow-aceternity backdrop-blur-xl">
        <Logo />
        <Sheet onOpenChange={setIsOpen} open={isOpen}>
          <SheetTrigger
            render={
              <button
                aria-label="Open menu"
                className="flex size-9 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-aceternity"
              />
            }
          >
            <HamburgerIcon className="size-4 shrink-0 text-brand" />
          </SheetTrigger>
          <SheetContent
            className="avenire-marketing-scope dark inset-0 h-dvh w-screen max-w-none border-0 bg-neutral-950 p-0 text-neutral-100"
            showCloseButton={false}
            side="right"
          >
            <div className="absolute inset-0 bg-[repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:12px_12px] opacity-40" />
            <div className="relative z-10 flex min-h-dvh flex-col">
              <SheetHeader className="flex-row items-center justify-between border-white/10 border-b p-4">
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
                      className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-aceternity"
                    />
                  }
                >
                  <CloseIcon className="size-4 shrink-0 text-brand" />
                </SheetClose>
              </SheetHeader>

              <div className="flex flex-1 flex-col px-4 pt-8">
                <div className="grid gap-3">
                  {mobileItems.map((item, index) => (
                    <SheetClose
                      key={item.title}
                      render={
                        <Link
                          className="font-medium text-2xl text-white transition duration-200 hover:text-brand"
                          href={item.href as any}
                        />
                      }
                    >
                      <motion.span
                        animate={{ opacity: 1, y: 0 }}
                        className="block"
                        initial={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.24, delay: index * 0.05 }}
                      >
                        {item.title}
                      </motion.span>
                    </SheetClose>
                  ))}
                </div>
              </div>

              <SheetFooter className="border-white/10 border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button
                  as={Link}
                  className="w-full py-3"
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  variant="secondary"
                >
                  Log in
                </Button>
                <Button
                  as={Link}
                  className="w-full py-3"
                  href="/waitlist"
                  onClick={() => setIsOpen(false)}
                >
                  Join waitlist
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export function FloatingNav({ items }: { items: MarketingNavItem[] }) {
  const { scrollY } = useScroll();
  const springConfig = {
    stiffness: 300,
    damping: 30,
  };
  const y = useSpring(
    useTransform(scrollY, [100, 120], [-100, 10]),
    springConfig
  );

  return (
    <motion.div
      className="fixed inset-x-6 top-0 z-50 mx-auto hidden max-w-[68rem] items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/82 px-4 py-3 shadow-aceternity backdrop-blur-sm md:flex dark:bg-neutral-950/82"
      style={{ y }}
    >
      <Logo />
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">
        {items.map((item) => (
          <Link
            className="rounded-full px-4 py-2 font-medium text-sm text-white/68 transition duration-200 hover:bg-white/6 hover:text-white"
            href={item.href as any}
            key={item.title}
          >
            {item.title}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button
          as={Link}
          className="px-5 py-2.5 text-sm"
          href="/login"
          variant="secondary"
        >
          Log in
        </Button>
        <Button as={Link} className="px-5 py-2.5 text-sm" href="/waitlist">
          Join waitlist
        </Button>
      </div>
    </motion.div>
  );
}
