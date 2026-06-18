import { ArrowLeft, Calendar, Clock, Tag } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ElementType } from "react";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { getAllSlugs, getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { metadataBase } from "@/lib/page-metadata";
import { ReadingProgressBar } from "./reading-progress";
import { ShareActions } from "./share-actions";

const ArrowLeftIcon = ArrowLeft as ElementType;
const CalendarIcon = Calendar as ElementType;
const ClockIcon = Clock as ElementType;
const TagIcon = Tag as ElementType;

export const dynamic = "force-static";
export const dynamicParams = false;

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
  const imageUrl = new URL("/api/og", metadataBase);
  imageUrl.searchParams.set("template", "blog");
  imageUrl.searchParams.set("title", post.title);
  imageUrl.searchParams.set("category", post.tags[0] ?? "AI Learning");
  imageUrl.searchParams.set("date", post.date);
  imageUrl.searchParams.set("readingTime", post.readingTime);
  const image = post.coverImage
    ? new URL(post.coverImage, metadataBase).toString()
    : imageUrl.toString();

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
  const imageUrl = new URL("/api/og", metadataBase);
  imageUrl.searchParams.set("template", "blog");
  imageUrl.searchParams.set("title", post.title);
  imageUrl.searchParams.set("category", post.tags[0] ?? "AI Learning");
  imageUrl.searchParams.set("date", post.date);
  imageUrl.searchParams.set("readingTime", post.readingTime);
  const image = post.coverImage
    ? new URL(post.coverImage, metadataBase).toString()
    : imageUrl.toString();

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
          metadataBase,
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

  // Get related posts
  const relatedPosts = getRelatedPosts(slug, post.tags, post.category, 3);

  // Dynamically import the MDX module for this slug.
  let PostContent: React.ComponentType = () => null;
  try {
    const mod = await import(`@/content/blog/${slug}.mdx`);
    PostContent = mod.default;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code !== "MODULE_NOT_FOUND"
    ) {
      throw err;
    }
    const { default: Markdown } = await import("react-markdown");
    const rehypeKatex = (await import("rehype-katex")).default;
    const remarkGfm = (await import("remark-gfm")).default;
    const remarkMath = (await import("remark-math")).default;

    PostContent = () => (
      <Markdown
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
      >
        {post.content}
      </Markdown>
    );
  }

  const pageUrl = `${metadataBase.origin}/blog/${slug}`;
  const shareText = `${post.title} by Avenire`;

  return (
    <main className="avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100">
      {articleSchema ? (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
          type="application/ld+json"
        />
      ) : null}

      {/* Reading Progress Bar */}
      <ReadingProgressBar />

      <Navbar />

      {/* Hero header with gradient */}
      <header className="relative overflow-hidden px-4 pt-32 pb-12 md:pb-16">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/5 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/[0.02] via-transparent to-transparent" />

        <div className="relative mx-auto max-w-[44rem]">
          {/* Back link */}
          <Link
            className="group mb-8 inline-flex items-center gap-1.5 text-white/40 text-sm transition-colors hover:text-white/80"
            href="/blog"
          >
            <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
            All posts
          </Link>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 font-medium text-brand text-xs"
                  key={tag}
                >
                  <TagIcon className="size-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="mb-4 font-semibold text-3xl text-white leading-tight tracking-tight md:text-4xl lg:text-5xl lg:leading-[1.15]">
            {post.title}
          </h1>

          {/* Description */}
          {post.description && (
            <p className="mb-6 text-base text-white/55 leading-relaxed md:text-lg">
              {post.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/40 text-sm">
            <span className="font-medium text-white/60">
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon className="size-3.5" />
              {post.readingTime}
            </span>
          </div>
        </div>
      </header>

      {/* Cover image (full-bleed style) */}
      {post.coverImage && (
        <div className="px-4">
          <div className="mx-auto max-w-[44rem]">
            <div className="mb-12 overflow-hidden rounded-xl border border-divide">
              <img
                alt={post.title}
                className="h-auto w-full object-cover"
                src={post.coverImage}
              />
            </div>
          </div>
        </div>
      )}

      {/* Article content */}
      <article className="px-4 pb-24">
        <div className="mx-auto max-w-[44rem]">
          {/* MDX Content */}
          <div className="prose-avenire text-[15px] leading-[1.75] text-white/75 md:text-base">
            <PostContent />
          </div>

          {/* Share Actions */}
          <div className="mt-12 border-divide border-t pt-8">
            <ShareActions url={pageUrl} title={shareText} />
          </div>

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <div className="mt-12 border-divide border-t pt-10">
              <h2 className="mb-6 font-semibold text-xl text-white tracking-tight">
                Related Articles
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    className="group block"
                    href={`/blog/${relatedPost.slug}`}
                    key={relatedPost.slug}
                  >
                    <article className="flex h-full flex-col rounded-xl border border-divide bg-neutral-900/55 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-black/10 hover:shadow-lg">
                      {relatedPost.coverImage && (
                        <div className="-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-xl border-divide border-b">
                          <div className="aspect-[16/9] overflow-hidden">
                            <img
                              alt={relatedPost.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              src={relatedPost.coverImage}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mb-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-1.5 py-0.5 font-medium text-brand text-[10px]">
                          {relatedPost.tags[0] ?? relatedPost.category}
                        </span>
                      </div>

                      <h3 className="mb-2 flex-1 font-semibold text-white text-sm leading-snug transition-colors duration-200 group-hover:text-brand line-clamp-2">
                        {relatedPost.title}
                      </h3>

                      <div className="mt-auto flex items-center gap-2 text-white/35 text-[11px]">
                        <span>{formatDate(relatedPost.date)}</span>
                        <span>•</span>
                        <span>{relatedPost.readingTime}</span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Footer navigation */}
          <div className="mt-12 border-divide border-t pt-8">
            <Link
              className="group inline-flex items-center gap-1.5 text-white/40 text-sm transition-colors hover:text-brand"
              href="/blog"
            >
              <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Back to all posts
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
