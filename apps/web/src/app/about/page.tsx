import fs from "node:fs";
import path from "node:path";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MarketingPageFrame,
  MarketingPageShell,
} from "@/components/marketing/page-shell";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Learn what Avenire is building and why we think AI should deepen understanding instead of replacing it.",
  path: "/about",
  title: "About",
});

export const dynamic = "force-static";

const mdxComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mb-6 border-divide border-b pb-4 font-sans font-semibold text-2xl text-white tracking-tight md:text-3xl"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="mt-8 mb-3 font-sans font-semibold text-lg text-white tracking-tight md:text-xl"
      {...props}
    >
      {children}
    </h2>
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 text-white/72 leading-relaxed" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 ml-5 list-disc space-y-2 text-white/72" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-4 ml-5 list-decimal space-y-2 text-white/72" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  hr: () => <hr className="my-7 border-divide" />,
};

export default function AboutPage() {
  const visionPath = path.join(process.cwd(), "content/legal/vision.md");
  const source = fs.readFileSync(visionPath, "utf-8");

  return (
    <MarketingPageShell>
      <MarketingPageFrame>
        <div className="mx-auto max-w-[56rem]">
          <p className="mb-4 font-medium text-brand text-xs uppercase tracking-widest">
            About
          </p>
          <article className="border-divide border-t pt-8 font-mono text-[13px] md:text-[14px]">
            <Markdown components={mdxComponents} remarkPlugins={[remarkGfm]}>
              {source}
            </Markdown>
          </article>
        </div>
      </MarketingPageFrame>
    </MarketingPageShell>
  );
}
