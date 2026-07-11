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
import { Container } from "./container";
import { Logo } from "./logo";

const items = [
  {
    title: "pricing",
    href: "/pricing",
  },
  {
    title: "roadmap",
    href: "/roadmap",
  },
  {
    title: "about",
    href: "/about",
  },
  {
    title: "blog",
    href: "/blog",
  },
];

export const Navbar = () => {
  return (
    <Container as="nav" className="px-4 sm:px-6">
      <FloatingNav items={items} />
      <DesktopNav items={items} />
      <MobileNav items={items} />
    </Container>
  );
};

const MobileNav = ({ items }: { items: { title: string; href: string }[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const mobileItems = items.filter((item) => item.href !== "/pricing");

  return (
    <div className="fixed inset-x-3 top-3 z-50 md:hidden">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/88 p-3 shadow-aceternity backdrop-blur-xl">
        <Logo />
        <Sheet onOpenChange={setIsOpen} open={isOpen}>
          <SheetTrigger
            render={
              <button type="button"
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
                    <button type="button"
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
                          className="font-medium text-2xl text-white capitalize transition duration-200 hover:text-brand"
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
                  Login
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
};

const DesktopNav = ({
  items,
}: {
  items: { title: string; href: string }[];
}) => {
  return (
    <div className="hidden items-center justify-between px-4 py-4 md:flex">
      <Logo />
      <div className="flex items-center gap-10">
        {items.map((item) => (
          <Link
            className="font-medium text-gray-600 transition duration-200 hover:text-brand dark:text-gray-300 dark:hover:text-brand"
            href={item.href as any}
            key={item.title}
          >
            {item.title}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button as={Link} href="/login" variant="secondary">
          Login
        </Button>
        <Button as={Link} href="/waitlist">
          Join waitlist
        </Button>
      </div>
    </div>
  );
};

const FloatingNav = ({
  items,
}: {
  items: { title: string; href: string }[];
}) => {
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
      className="fixed inset-x-6 top-0 z-50 mx-auto hidden max-w-[68rem] items-center justify-between rounded-2xl border border-white/10 bg-neutral-950/82 px-2 py-2 shadow-aceternity backdrop-blur-sm md:flex dark:bg-neutral-950/82"
      style={{ y }}
    >
      <Logo />
      <div className="flex items-center gap-10">
        {items.map((item) => (
          <Link
            className="font-medium text-gray-600 transition duration-200 hover:text-brand dark:text-gray-300 dark:hover:text-brand"
            href={item.href as any}
            key={item.title}
          >
            {item.title}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button as={Link} href="/login" variant="secondary">
          Login
        </Button>
        <Button as={Link} href="/waitlist">
          Join waitlist
        </Button>
      </div>
    </motion.div>
  );
};
