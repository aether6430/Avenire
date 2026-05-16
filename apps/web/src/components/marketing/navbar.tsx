import Link from "next/link";
import { Button } from "./button";
import { Container } from "./container";
import { Logo } from "./logo";
import { FloatingNav, MobileNav } from "./navbar-client";

const items = [
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "Roadmap",
    href: "/roadmap",
  },
  {
    title: "About",
    href: "/about",
  },
  {
    title: "Blog",
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

const DesktopNav = ({
  items,
}: {
  items: { title: string; href: string }[];
}) => {
  return (
    <div className="hidden items-center justify-between border-divide border-b px-6 py-5 md:flex">
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
    </div>
  );
};
