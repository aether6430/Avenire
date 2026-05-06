import fs from "node:fs";
import path from "node:path";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Learn what Avenire is building and why we think AI should deepen understanding instead of replacing it.",
  path: "/about",
  title: "About",
});

const mdxComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mb-6 border-border/80 border-b pb-4 font-sans font-semibold text-2xl text-foreground tracking-tight md:text-3xl"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="mt-8 mb-3 font-sans font-semibold text-foreground text-lg tracking-tight md:text-xl"
      {...props}
    >
      {children}
    </h2>
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 text-foreground/85 leading-relaxed" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="mb-4 ml-5 list-disc space-y-2 text-foreground/85"
      {...props}
    />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className="mb-4 ml-5 list-decimal space-y-2 text-foreground/85"
      {...props}
    />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  hr: () => <hr className="my-7 border-border/80" />,
};

export default function AboutPage() {
  const visionPath = path.join(process.cwd(), "content/legal/vision.md");
  const source = fs.readFileSync(visionPath, "utf-8");

  return (
    <main className="avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />

      <section className="px-4 pt-32 pb-24">
        <div className="mx-auto max-w-[72rem] border-divide border-x px-4 py-8 md:px-8">
          <div className="mx-auto max-w-[56rem]">
          <div className="overflow-hidden rounded-2xl border border-divide bg-neutral-900/70 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-divide border-b bg-white/5 px-4 py-3">
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                Avenire Mission Document
              </p>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-45"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, color-mix(in oklab, var(--border) 75%, transparent) 28px)",
                }}
              />

              <article className="relative px-5 py-8 font-mono text-[13px] md:px-10 md:py-10 md:text-[14px]">
                <Markdown
                  components={mdxComponents}
                  remarkPlugins={[remarkGfm]}
                >
                  {source}
                </Markdown>
              </article>
            </div>
          </div>
        </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
