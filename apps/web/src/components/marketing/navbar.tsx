import { Container } from "./container";
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
      <MobileNav items={items} />
    </Container>
  );
};
