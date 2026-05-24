import { Button } from "./button";
import { Container } from "./container";
import { Logo } from "./logo";

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
    <>
      <div aria-hidden="true" className="h-16 md:hidden" />
      <Container as="nav" className="px-4 sm:px-6">
        <div className="fixed inset-x-3 top-3 z-50 flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-neutral-950/88 px-3 py-1 shadow-[0_14px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl md:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <Button
              as="a"
              className="h-11 whitespace-nowrap px-4 text-sm max-[340px]:px-3 max-[340px]:text-[13px]"
              href="/login"
              variant="secondary"
            >
              Log in
            </Button>
            <Button
              as="a"
              className="h-11 whitespace-nowrap px-4 text-sm max-[340px]:px-3 max-[340px]:text-[13px]"
              href="/waitlist"
            >
              Join the waitlist
            </Button>
          </div>
        </div>
        <div className="fixed inset-x-6 top-3 z-50 mx-auto hidden max-w-[72rem] grid-cols-[1fr_auto_1fr] items-center rounded-[1.55rem] border border-white/10 bg-neutral-950/82 px-5 py-2.5 shadow-aceternity backdrop-blur-xl md:grid">
          <div className="justify-self-start">
            <Logo />
          </div>
          <div className="flex items-center gap-8 justify-self-center">
            {items.map((item) => (
              <a
                className="font-medium text-[15px] text-white/70 transition duration-200 hover:text-white"
                href={item.href}
                key={item.title}
              >
                {item.title}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 justify-self-end">
            <Button
              as="a"
              className="px-5 py-2 text-sm"
              href="/login"
              variant="secondary"
            >
              Log in
            </Button>
            <Button as="a" className="px-5 py-2 text-sm" href="/waitlist">
              Join the waitlist
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
};
