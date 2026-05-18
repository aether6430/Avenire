import { ArrowRight, Calendar, Clock, Tag } from "@phosphor-icons/react/ssr";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/marketing/container";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import type { PostMeta } from "@/lib/blog";
import { getAllPostMetas } from "@/lib/blog";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  description:
    "Read Avenire articles on AI learning, interactive study, research workflows, and building real understanding.",
  path: "/blog",
  title: "Blog",
});

export const dynamic = "force-static";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function blogPostHref(slug: string): Route {
  return `/blog/${slug}` as Route;
}

function FeaturedPostCard({ post }: { post: PostMeta }) {
  return (
    <Link className="group block" href={blogPostHref(post.slug)}>
      <article className="grid gap-8 border-divide border-y py-8 transition-colors duration-300 hover:border-brand/45 md:grid-cols-[0.96fr_1.04fr] md:items-center md:py-10">
        <PostImage
          className="aspect-[16/10]"
          post={post}
          priority
          sizes="(min-width: 768px) 42rem, 100vw"
        />

        <div>
          <div className="mb-5 flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 font-medium text-brand text-xs"
                key={tag}
              >
                <Tag className="size-2.5" />
                {tag}
              </span>
            ))}
            <span className="inline-flex items-center rounded-full border border-divide bg-white/5 px-2.5 py-0.5 font-medium text-white/60 text-xs">
              Featured
            </span>
          </div>

          <h2 className="mb-4 font-semibold text-2xl text-white leading-snug tracking-tight transition-colors duration-200 group-hover:text-brand md:text-3xl">
            {post.title}
          </h2>

          <p className="mb-6 max-w-2xl text-base text-white/62 leading-relaxed">
            {post.description}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-white/48 text-xs">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {formatDate(post.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {post.readingTime}
              </span>
              <span className="font-medium text-white/62">{post.author}</span>
            </div>
            <span className="flex items-center gap-1 font-medium text-brand text-sm transition-all duration-200 group-hover:gap-2">
              Read more <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function PostImage({
  className,
  post,
  priority = false,
  sizes,
}: {
  className: string;
  post: PostMeta;
  priority?: boolean;
  sizes?: string;
}) {
  if (!post.coverImage) {
    return (
      <div
        className={`overflow-hidden rounded-lg border border-white/10 bg-[repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:12px_12px] ${className}`}
      />
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border border-white/10 bg-neutral-900/70 ${className}`}
    >
      <Image
        alt={post.title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        height={900}
        priority={priority}
        sizes={sizes}
        src={post.coverImage}
        width={1600}
      />
    </div>
  );
}

function PostRow({ post }: { post: PostMeta }) {
  return (
    <Link className="group block" href={blogPostHref(post.slug)}>
      <article className="grid gap-5 border-divide border-t py-6 transition-colors duration-300 hover:border-brand/35 md:grid-cols-[12rem_1fr_auto] md:items-center">
        <PostImage
          className="aspect-[16/9] md:aspect-[4/3]"
          post={post}
          sizes="(min-width: 768px) 12rem, 100vw"
        />

        <div>
          {post.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 2).map((tag) => (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 font-medium text-white/56 text-xs"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h3 className="font-semibold text-lg text-white leading-snug transition-colors duration-200 group-hover:text-brand">
            {post.title}
          </h3>

          <p className="mt-3 line-clamp-2 max-w-2xl text-sm text-white/58 leading-relaxed">
            {post.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-white/45 text-xs">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {post.readingTime}
            </span>
          </div>
        </div>

        <span className="hidden items-center gap-1 font-medium text-brand text-sm transition-all duration-200 group-hover:gap-2 md:flex">
          Read <ArrowRight className="size-4" />
        </span>
      </article>
    </Link>
  );
}

export default function BlogPage() {
  const posts = getAllPostMetas();
  const featuredPool = posts
    .filter((post) => post.featured)
    .sort((a, b) => {
      const orderDiff =
        (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.featuredOrder ?? Number.MAX_SAFE_INTEGER);
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  const featured = featuredPool[0] ?? posts[0];
  const rest = featured
    ? posts.filter((post) => post.slug !== featured.slug)
    : posts;

  return (
    <MarketingPageShell>
      <section className="px-4 pt-28 md:pt-12">
        <Container className="border-divide border-x px-4 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-[56rem]">
            <div className="mb-2">
              <span className="font-medium text-brand text-xs uppercase tracking-widest">
                From the blog
              </span>
            </div>
            <h1 className="mb-4 font-semibold text-4xl text-white tracking-tight md:text-5xl">
              Thoughts & Updates
            </h1>
            <p className="max-w-xl text-lg text-white/60 leading-relaxed">
              Insights on AI reasoning, product updates, and ideas from the
              Avenire team.
            </p>
          </div>
        </Container>
      </section>

      <section className="px-4 pb-24">
        <Container className="border-divide border-x px-4 pb-16 md:px-8">
          <div className="mx-auto max-w-[64rem] space-y-12">
            {featured && (
              <div>
                <FeaturedPostCard post={featured} />
              </div>
            )}

            {rest.length > 0 && (
              <div>
                <h2 className="mb-6 font-medium text-sm text-white/45 uppercase tracking-widest">
                  More posts
                </h2>
                <div>
                  {rest.map((post) => (
                    <PostRow key={post.slug} post={post} />
                  ))}
                </div>
              </div>
            )}

            {posts.length === 0 && (
              <div className="py-24 text-center text-white/50">
                <p className="text-lg">No posts yet. Check back soon!</p>
              </div>
            )}
          </div>
        </Container>
      </section>
    </MarketingPageShell>
  );
}
