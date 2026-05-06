import fs from "node:fs";
import path from "node:path";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Read Avenire's privacy policy and data handling practices for the AI learning workspace.",
  path: "/privacy",
  title: "Privacy Policy",
});

export const dynamic = "force-static";

const mdxComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mt-8 mb-4 font-semibold text-3xl text-white tracking-tight md:text-4xl"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="mt-8 mb-3 font-semibold text-2xl text-white tracking-tight"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-6 mb-2 font-semibold text-white text-xl" {...props}>
      {children}
    </h3>
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 text-white/70 leading-relaxed" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className="my-3 ml-5 list-disc space-y-2 text-white/70"
      {...props}
    />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className="my-3 ml-5 list-decimal space-y-2 text-white/70"
      {...props}
    />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-brand underline underline-offset-4 hover:text-brand/80"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-divide" />,
};

export default function PrivacyPage() {
  const policyPath = path.join(process.cwd(), "content/legal/privacy.md");
  const source = fs.readFileSync(policyPath, "utf-8");

  return (
    <main className="avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />

      <section className="px-4 pt-32 pb-24">
        <div className="mx-auto max-w-[72rem] border-divide border-x border-y px-4 py-8 md:px-8">
          <div className="mx-auto max-w-[48rem]">
            <Markdown components={mdxComponents} remarkPlugins={[remarkGfm]}>
              {source}
            </Markdown>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
