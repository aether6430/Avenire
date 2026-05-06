import {
  GithubLogo as Github,
  Envelope as Mail,
  ChatCircle as MessageCircle,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { AvenireMark } from "@/components/branding/AvenireMark";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      {
        label: "Contact",
        href: "mailto:support@avenire.space",
        external: true,
      },
    ],
  },
] as const;

const socialLinks = [
  { label: "Discord", href: "https://discord.gg/avenire", icon: MessageCircle },
  {
    label: "GitHub",
    href: "https://github.com/thedamod/Avenire",
    icon: Github,
  },
  { label: "Email", href: "mailto:support@avenire.space", icon: Mail },
] as const;

export function Footer() {
  return (
    <footer className="border-border border-t">
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-24">
        <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-start md:justify-between md:text-left">
          <div className="md:w-[24rem]">
            <Link
              className="inline-flex items-center justify-center gap-2 font-semibold text-base text-foreground md:justify-start"
              href="/"
            >
              <AvenireMark className="h-5 w-auto shrink-0" />
              <span>Avenire</span>
            </Link>
            <div className="mt-4">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                Follow the build:
              </p>
              <div className="mt-2 flex items-center justify-center gap-2 md:justify-start">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      aria-label={link.label}
                      className="inline-flex size-7 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition-colors hover:text-foreground"
                      href={link.href}
                      key={link.label}
                      rel="noopener noreferrer"
                      target="_blank"
                      title={link.label}
                    >
                      <Icon className="size-3.5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid w-full max-w-sm grid-cols-2 gap-8 md:ml-auto md:w-[20rem]">
            {columns.map((column) => (
              <div key={column.title}>
                <h4 className="mb-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {column.title}
                </h4>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {"external" in link && link.external ? (
                        <a
                          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                          href={link.href}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                          href={link.href}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 border-border border-t pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-muted-foreground/60 text-xs">
            © {new Date().getFullYear()} Avenire. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link
              className="text-muted-foreground/60 text-xs transition-colors hover:text-muted-foreground"
              href="/privacy"
            >
              Privacy
            </Link>
            <Link
              className="text-muted-foreground/60 text-xs transition-colors hover:text-muted-foreground"
              href="/about"
            >
              About
            </Link>
            <Link
              className="text-muted-foreground/60 text-xs transition-colors hover:text-muted-foreground"
              href="/blog"
            >
              Blog
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
