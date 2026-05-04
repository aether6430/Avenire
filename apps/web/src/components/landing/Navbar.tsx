"use client";

import { useSession } from "@avenire/auth/client";
import { Button } from "@avenire/ui/components/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@avenire/ui/components/navigation-menu";
import { List as MenuIcon, XIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { AvenireMark } from "@/components/branding/AvenireMark";
import { cn } from "@/lib/utils";

const SIGN_UP_HREF = "/waitlist";
const SIGN_IN_HREF = "/login";
const APP_HREF = "/workspace";

const highlightedBlog = {
  title:
    "Introducing Avenire: Interactive AI Learning That Builds Understanding",
  href: "/blog/introducing-avenire",
  description:
    "Why we built Avenire and how interactive AI study can deepen understanding instead of shortcutting it.",
  image: "/blog/interactive-learning.jpeg",
} as const;

const productLinks = [
  {
    title: "Roadmap",
    href: "/roadmap",
    description: "Track what is shipping now and what is coming next.",
  },
  {
    title: "Pricing",
    href: "/pricing",
    description: "Compare plans and see what you get at each level.",
  },
  {
    title: "Privacy",
    href: "/privacy",
    description: "Review how your data is handled and protected.",
  },
] as const;

const pageLinks = [
  {
    title: "About",
    href: "/about",
    description: "Learn the mission and philosophy behind Avenire.",
  },
  {
    title: "Roadmap",
    href: "/roadmap",
    description: "Track what is shipping now and what is coming next.",
  },
  {
    title: "Privacy",
    href: "/privacy",
    description: "Review how your data is handled and protected.",
  },
] as const;

const mobileLinks = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Meet Apollo", href: "/#meet-apollo" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Privacy", href: "/privacy" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <div className="fixed top-4 right-0 left-0 z-50 flex justify-center px-4">
        <nav
          className={cn(
            "flex w-full max-w-5xl items-center justify-between rounded-full border border-border px-4 py-1.5 transition-all duration-300",
            scrolled
              ? "bg-background/90 shadow-lg backdrop-blur-xl"
              : "bg-background/60 backdrop-blur-md"
          )}
        >
          <Link
            className="flex items-center gap-2 px-2 py-1 font-semibold text-foreground text-sm"
            href="/"
          >
            <AvenireMark className="h-4 w-auto shrink-0" />
            <span>Avenire</span>
          </Link>

          <div className="hidden md:flex md:items-center">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-7 rounded-full px-2.5 text-[11px] hover:bg-muted/60 focus:bg-muted/60 data-[state=open]:bg-muted/70">
                    Solution
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-2 p-3 md:w-[420px] lg:w-[560px] lg:grid-cols-[1.1fr_0.9fr]">
                      {productLinks.map((link) => (
                        <ListItem
                          href={link.href}
                          key={link.title}
                          title={link.title}
                        >
                          {link.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-7 rounded-full px-2.5 text-[11px] hover:bg-muted/60 focus:bg-muted/60 data-[state=open]:bg-muted/70">
                    Resources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[360px] gap-2 p-3 md:w-[500px] md:grid-cols-2 lg:w-[560px]">
                      <li className="row-span-3">
                        <NavigationMenuLink
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-3 no-underline outline-none focus:shadow-md"
                          render={<Link href={highlightedBlog.href} />}
                        >
                          <div className="relative mb-2 h-24 w-full overflow-hidden rounded-md border border-border/60 bg-background">
                            <Image
                              alt={highlightedBlog.title}
                              className="object-cover"
                              fill
                              sizes="(max-width: 768px) 100vw, 280px"
                              src={highlightedBlog.image}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            Highlighted blog
                          </p>
                          <div className="mt-1 font-medium text-xs leading-tight">
                            {highlightedBlog.title}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                            {highlightedBlog.description}
                          </p>
                        </NavigationMenuLink>
                      </li>
                      {pageLinks.map((link) => (
                        <ListItem
                          href={link.href}
                          key={link.title}
                          title={link.title}
                        >
                          {link.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "h-7 rounded-full px-2.5 text-[11px] hover:bg-muted/60 focus:bg-muted/60 data-[active]:bg-muted/70"
                    )}
                    render={<Link href="/pricing" />}
                  >
                    Pricing
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden items-center gap-1.5 md:flex">
            {isSignedIn ? (
              <Button
                className="rounded-full px-3 text-xs"
                nativeButton={false}
                render={<Link href={APP_HREF as Route} />}
                size="sm"
              >
                Go to app
              </Button>
            ) : (
              <>
                <Button
                  className="rounded-full px-3 text-xs"
                  nativeButton={false}
                  render={<Link href={SIGN_IN_HREF} />}
                  size="sm"
                  variant="ghost"
                >
                  Log in
                </Button>
                <Button
                  className="rounded-full px-3 text-xs"
                  nativeButton={false}
                  render={<Link href={SIGN_UP_HREF as Route} />}
                  size="sm"
                >
                  Join waitlist
                </Button>
              </>
            )}
          </div>

          <div className="mobile-only">
            <button
              aria-label="Open menu"
              className="flex size-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/50"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon className="size-4" />
            </button>
          </div>
        </nav>
      </div>

      <div
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-0 z-[100] flex flex-col bg-background transition-all duration-300 ease-out",
          mobileOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-4 opacity-0"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <Link
            className="flex items-center gap-2 font-semibold text-foreground text-sm"
            href="/"
            onClick={() => setMobileOpen(false)}
          >
            <AvenireMark className="h-4 w-auto shrink-0" />
            <span>Avenire</span>
          </Link>
          <button
            aria-label="Close menu"
            className="flex size-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/50"
            onClick={() => setMobileOpen(false)}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 px-6 pt-6">
          {mobileLinks.map((link, i) => (
            <a
              className="border-border border-b py-3 font-medium text-2xl text-foreground transition-all hover:bg-muted/30 hover:text-foreground"
              href={link.href}
              key={link.label}
              onClick={() => setMobileOpen(false)}
              style={{
                transitionDelay: mobileOpen ? `${i * 50}ms` : "0ms",
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? "translateX(0)" : "translateX(-12px)",
                transitionDuration: "300ms",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-3 px-6 pb-8">
          {isSignedIn ? (
            <Button
              className="w-full rounded-full"
              nativeButton={false}
              onClick={() => setMobileOpen(false)}
              render={<Link href={APP_HREF as Route} />}
              size="lg"
            >
              Go to app
            </Button>
          ) : (
            <>
              <Button
                className="w-full rounded-full"
                nativeButton={false}
                onClick={() => setMobileOpen(false)}
                render={<Link href={SIGN_IN_HREF} />}
                size="lg"
                variant="outline"
              >
                Log in
              </Button>
              <Button
                className="w-full rounded-full"
                nativeButton={false}
                onClick={() => setMobileOpen(false)}
                render={<Link href={SIGN_UP_HREF as Route} />}
                size="lg"
              >
                Join waitlist
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ListItem({
  className,
  title,
  children,
  href,
}: {
  className?: string;
  title: string;
  href: Route;
  children: React.ReactNode;
}) {
  return (
    <li>
      <NavigationMenuLink
        className={cn(
          "block select-none space-y-0.5 rounded-md p-2.5 leading-none no-underline outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus:bg-muted/60 focus:text-foreground",
          className
        )}
        render={<Link href={href} />}
      >
        <div className="font-medium text-xs leading-none">{title}</div>
        <p className="line-clamp-2 text-muted-foreground text-xs leading-snug">
          {children}
        </p>
      </NavigationMenuLink>
    </li>
  );
}
