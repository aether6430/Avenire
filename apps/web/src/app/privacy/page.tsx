import fs from "node:fs";
import path from "node:path";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Read Avenire's privacy policy and data handling practices for the AI learning workspace.",
  path: "/privacy",
  title: "Privacy Policy",
});

const mdxComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mt-8 mb-4 font-semibold text-3xl text-foreground tracking-tight md:text-4xl"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="mt-8 mb-3 font-semibold text-2xl text-foreground tracking-tight"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-6 mb-2 font-semibold text-foreground text-xl" {...props}>
      {children}
    </h3>
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 text-foreground/80 leading-relaxed" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-3 ml-5 list-disc space-y-2 text-foreground/80"
      {...props}
    />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className="my-3 ml-5 list-decimal space-y-2 text-foreground/80"
      {...props}
    />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-primary underline underline-offset-4 hover:text-primary/80"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-border" />,
};

export default function PrivacyPage() {
  const policyPath = path.join(process.cwd(), "content/legal/privacy.md");
  const source = fs.readFileSync(policyPath, "utf-8");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="px-4 pt-32 pb-24">
        <div className="mx-auto max-w-3xl">
          <Markdown components={mdxComponents} remarkPlugins={[remarkGfm]}>
            {source}
          </Markdown>
        </div>
      </section>

      <Footer />
    </main>
  );
}
