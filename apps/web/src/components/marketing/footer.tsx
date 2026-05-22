import { ChatCircle, Envelope, GithubLogo } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { AvenireMark } from "@/components/branding/AvenireMark";
import { Container } from "./container";

const productLinks = [
  { label: "home", href: "/" },
  { label: "pricing", href: "/pricing" },
  { label: "roadmap", href: "/roadmap" },
  { label: "blog", href: "/blog" },
] as const;

const learningLinks = [
  { label: "AI study app", href: "/" },
  { label: "AI tutor", href: "/blog/introducing-avenire" },
  { label: "flashcards", href: "/pricing" },
  { label: "research workspace", href: "/about" },
] as const;

const companyLinks = [
  { label: "about", href: "/about" },
  { label: "privacy", href: "/privacy" },
  { label: "terms", href: "/terms" },
  { label: "contact", href: "mailto:support@avenire.space", external: true },
] as const;

const communityLinks = [
  {
    label: "github",
    href: "https://github.com/thedamod/Avenire",
    icon: GithubLogo,
  },
  {
    label: "discord",
    href: "https://discord.gg/avenire",
    icon: ChatCircle,
  },
  {
    label: "email",
    href: "mailto:support@avenire.space",
    icon: Envelope,
  },
] as const;

export const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-divide border-t bg-[#050506]">
      <Container className="relative min-h-[31rem] px-6 pt-16 pb-8 md:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-0.42em] left-1/2 w-[115vw] -translate-x-1/2 select-none overflow-hidden text-center font-semibold text-[25vw] text-white/[0.065] leading-none tracking-[-0.08em] md:text-[27vw]"
        >
          Avenire
        </div>

        <div className="relative z-10 grid gap-12 md:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">
          <div className="max-w-xs">
            <Link
              className="inline-flex items-center gap-2 text-white"
              href="/"
            >
              <AvenireMark className="size-5 text-brand" />
              <span className="font-medium text-xl tracking-tight">
                Avenire
              </span>
            </Link>
            <p className="mt-4 max-w-[17rem] text-sm text-white/52 leading-6">
              Study, research, and reason through hard ideas in one connected AI
              workspace.
            </p>
          </div>

          <FooterColumn title="Avenire">
            {productLinks.map((link) => (
              <FooterLink href={link.href} key={link.label}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Learning">
            {learningLinks.map((link) => (
              <FooterLink href={link.href} key={link.label}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Company">
            {companyLinks.map((link) => (
              <FooterLink
                external={"external" in link}
                href={link.href}
                key={link.label}
              >
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <div className="flex flex-col items-start gap-4 md:items-end">
            <p className="text-white/36 text-xs uppercase tracking-[0.16em]">
              Community
            </p>
            <div className="flex gap-2">
              {communityLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <a
                    aria-label={link.label}
                    className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 text-white/56 transition-colors hover:border-brand/45 hover:text-brand"
                    href={link.href}
                    key={link.label}
                    rel="noreferrer"
                    target={
                      link.href.startsWith("mailto:") ? undefined : "_blank"
                    }
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-white/42">© 2026 Avenire</p>
          </div>
        </div>
      </Container>
    </footer>
  );
};

function FooterColumn({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <nav className="flex flex-col items-start gap-3">
      <p className="mb-1 text-white/36 text-xs uppercase tracking-[0.16em]">
        {title}
      </p>
      {children}
    </nav>
  );
}

function FooterLink({
  children,
  external,
  href,
}: {
  children: React.ReactNode;
  external?: boolean;
  href: string;
}) {
  const className = "text-sm text-white/72 transition-colors hover:text-brand";

  if (external) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href as any}>
      {children}
    </Link>
  );
}
