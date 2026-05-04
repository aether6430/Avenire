import { ArrowLeft, Calendar, Clock, Tag } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { metadataBase } from "@/lib/page-metadata";

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {};
  }
  const canonical = `/blog/${slug}`;
  const image = post.coverImage
    ? new URL(post.coverImage, metadataBase).toString()
    : new URL(
        `/api/og?title=${encodeURIComponent(post.title)}`,
        metadataBase
      ).toString();

  return {
    alternates: {
      canonical,
    },
    authors: [{ name: post.author }],
    description: post.description,
    openGraph: {
      description: post.description,
      images: [image],
      publishedTime: post.date,
      title: post.title,
      type: "article",
      url: canonical,
    },
    title: `${post.title} | Avenire Blog`,
    twitter: {
      card: "summary_large_image",
      description: post.description,
      images: [image],
      title: `${post.title} | Avenire Blog`,
    },
  };
}

function buildArticleSchema(slug: string) {
  const post = getPostBySlug(slug);
  if (!post) {
    return null;
  }

  const canonical = new URL(`/blog/${slug}`, metadataBase).toString();
  const image = post.coverImage
    ? new URL(post.coverImage, metadataBase).toString()
    : new URL(
        `/api/og?title=${encodeURIComponent(post.title)}`,
        metadataBase
      ).toString();

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    author: {
      "@type": "Person",
      name: post.author,
    },
    datePublished: post.date,
    description: post.description,
    headline: post.title,
    image: [image],
    mainEntityOfPage: canonical,
    publisher: {
      "@type": "Organization",
      logo: {
        "@type": "ImageObject",
        url: new URL(
          "/branding/avenire-logo-full.png",
          metadataBase
        ).toString(),
      },
      name: "Avenire",
    },
    url: canonical,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const mdxComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="mt-10 mb-4 font-semibold text-3xl text-foreground tracking-tight"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="mt-10 mb-3 font-semibold text-2xl text-foreground tracking-tight"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-8 mb-3 font-semibold text-foreground text-xl" {...props}>
      {children}
    </h3>
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-5 text-foreground/80 leading-relaxed" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-4 ml-6 list-none space-y-2" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-4 ml-6 list-outside list-decimal space-y-2" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li
      className="pl-1 text-foreground/80 leading-relaxed before:mr-2 before:text-primary before:content-['—']"
      {...props}
    />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
      {...props}
    />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em className="text-foreground/90 italic" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-6 border-primary/50 border-l-2 pl-5 text-muted-foreground italic"
      {...props}
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground/90 text-sm"
      {...props}
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="my-6 overflow-x-auto rounded-xl border border-border bg-card p-5 font-mono text-sm leading-relaxed"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-border" />,
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const articleSchema = buildArticleSchema(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      {articleSchema ? (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
          type="application/ld+json"
        />
      ) : null}
      <Navbar />

      <article className="px-4 pt-32 pb-24">
        <div className="mx-auto max-w-2xl">
          {/* Back link */}
          <Link
            className="group mb-10 inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/blog"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            All posts
          </Link>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-medium text-primary text-xs"
                  key={tag}
                >
                  <Tag className="size-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {post.coverImage && (
            <div className="mb-8 overflow-hidden rounded-xl border border-border/70">
              <Image
                alt={post.title}
                className="h-auto w-full object-cover"
                height={900}
                priority
                src={post.coverImage}
                width={1600}
              />
            </div>
          )}

          {/* Title */}
          <h1 className="mb-4 font-semibold text-3xl text-foreground leading-tight tracking-tight md:text-4xl">
            {post.title}
          </h1>

          {/* Description */}
          {post.description && (
            <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
              {post.description}
            </p>
          )}

          {/* Meta */}
          <div className="mb-10 flex flex-wrap items-center gap-4 border-border border-b pb-8 text-muted-foreground text-sm">
            <span className="font-medium text-foreground/70">
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {post.readingTime}
            </span>
          </div>

          {/* MDX Content */}
          <div className="prose-avenire">
            <Markdown
              components={mdxComponents}
              rehypePlugins={[rehypeKatex]}
              remarkPlugins={[remarkGfm, remarkMath]}
            >
              {post.content}
            </Markdown>
          </div>

          {/* Footer navigation */}
          <div className="mt-16 border-border border-t pt-8">
            <Link
              className="group inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-primary"
              href="/blog"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Back to all posts
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
