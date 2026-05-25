import { ArrowRight, Calendar, Clock, Tag } from "@phosphor-icons/react/ssr";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ElementType } from "react";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import type { PostMeta } from "@/lib/blog";
import { getAllPostMetas } from "@/lib/blog";
import { buildPageMetadata } from "@/lib/page-metadata";

const ArrowRightIcon = ArrowRight as ElementType;
const CalendarIcon = Calendar as ElementType;
const ClockIcon = Clock as ElementType;
const TagIcon = Tag as ElementType;

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
      <article className="relative overflow-hidden rounded-2xl border border-divide bg-neutral-900/60 p-8 transition-all duration-300 hover:border-brand/40 hover:shadow-black/20 hover:shadow-xl md:p-10">
        {post.coverImage ? (
          <div className="relative -mx-8 -mt-8 mb-6 overflow-hidden border-divide border-b md:-mx-10 md:-mt-10 md:mb-8">
            <Image
              alt={post.title}
              className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] md:h-64"
              height={900}
              priority
              src={post.coverImage}
              width={1600}
            />
          </div>
        ) : (
          <div className="relative -mx-8 -mt-8 mb-6 h-44 border-divide border-b bg-[repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:12px_12px] md:-mx-10 md:-mt-10 md:mb-8 md:h-52" />
        )}

        <div className="relative">
          <div className="mb-5 flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 font-medium text-brand text-xs"
                key={tag}
              >
                <TagIcon className="size-2.5" />
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-white/48 text-xs">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                {formatDate(post.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                {post.readingTime}
              </span>
              <span className="font-medium text-white/62">
                {post.author}
              </span>
            </div>
            <span className="flex items-center gap-1 font-medium text-brand text-sm transition-all duration-200 group-hover:gap-2">
              Read more <ArrowRightIcon className="size-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link className="group block h-full" href={blogPostHref(post.slug)}>
      <article className="flex h-full flex-col rounded-xl border border-divide bg-neutral-900/55 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-black/10 hover:shadow-lg">
        {post.coverImage ? (
          <div className="-mx-6 -mt-6 mb-5 overflow-hidden rounded-t-xl border-divide border-b">
            <Image
              alt={post.title}
              className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              height={700}
              src={post.coverImage}
              width={1200}
            />
          </div>
        ) : (
          <div className="-mx-6 -mt-6 mb-5 h-28 rounded-t-xl border-divide border-b bg-[repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:12px_12px]" />
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
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

        <h3 className="mb-3 flex-1 font-semibold text-white text-lg leading-snug transition-colors duration-200 group-hover:text-brand">
          {post.title}
        </h3>

        <p className="mb-5 line-clamp-3 text-white/58 text-sm leading-relaxed">
          {post.description}
        </p>

        <div className="mt-auto flex items-center gap-3 border-divide border-t pt-4 text-white/45 text-xs">
          <span className="flex items-center gap-1">
            <CalendarIcon className="size-3" />
            {formatDate(post.date)}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="size-3" />
            {post.readingTime}
          </span>
        </div>
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
    <main className="avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />

      {/* Hero */}
      <section className="px-4 pt-32">
        <div className="mx-auto max-w-[72rem] border-divide border-x border-t px-4 pt-8 pb-16 md:px-8">
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
        </div>
      </section>

      {/* Content */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-[72rem] border-divide border-x border-b px-4 pb-8 md:px-8">
        <div className="mx-auto max-w-[56rem] space-y-12">
          {/* Featured post */}
          {featured && (
            <div>
              <FeaturedPostCard post={featured} />
            </div>
          )}

          {/* Rest of posts */}
          {rest.length > 0 && (
            <div>
              <h2 className="mb-6 font-medium text-white/45 text-sm uppercase tracking-widest">
                More posts
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
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
        </div>
      </section>

      <Footer />
    </main>
  );
}
