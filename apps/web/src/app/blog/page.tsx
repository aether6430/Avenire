import { ArrowRight, Calendar, Clock, MagnifyingGlass, Tag, X } from "@phosphor-icons/react/ssr";
import type { Route } from "next";
import Link from "next/link";
import type { ElementType } from "react";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import type { PostMeta } from "@/lib/blog";
import { getAllPostMetas, CATEGORIES, getCategoryLabel } from "@/lib/blog";
import { buildPageMetadata } from "@/lib/page-metadata";

const ArrowRightIcon = ArrowRight as ElementType;
const CalendarIcon = Calendar as ElementType;
const ClockIcon = Clock as ElementType;
const MagnifyingGlassIcon = MagnifyingGlass as ElementType;
const TagIcon = Tag as ElementType;
const XIcon = X as ElementType;

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

function formatListDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function blogPostHref(slug: string): Route {
  return `/blog/${slug}` as Route;
}

// ── List Row ─────────────────────────────────────────────────────
function ListRow({ post }: { post: PostMeta }) {
  return (
    <Link className="group block border-divide border-b py-4 transition-colors hover:bg-white/[0.015] md:py-5" href={blogPostHref(post.slug)}>
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-6">
        {/* Date */}
        <span className="shrink-0 text-xs text-white/35 md:w-[100px]">
          {formatListDate(post.date)}
        </span>

        {/* Category */}
        <span className="shrink-0 text-xs font-medium text-brand/70 uppercase tracking-wider">
          {getCategoryLabel(post.category)}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm text-white/80 leading-snug transition-colors group-hover:text-brand md:text-base">
          {post.title}
        </span>

        {/* Author & read time */}
        <span className="hidden shrink-0 text-xs text-white/40 md:block md:w-[140px]">
          {post.author}
        </span>
        <span className="hidden shrink-0 text-xs text-white/35 md:block md:w-[80px] md:text-right">
          {post.readingTime}
        </span>
      </div>
    </Link>
  );
}

// ── Featured Hero Card (large, left side) ─────────────────────
function FeaturedHeroCard({ post }: { post: PostMeta }) {
  return (
    <Link className="group block h-full" href={blogPostHref(post.slug)}>
      <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-divide bg-neutral-900/60 transition-all duration-300 hover:border-brand/40 hover:shadow-black/15 hover:shadow-xl">
        {post.coverImage && (
          <div className="relative overflow-hidden border-divide border-b">
            <div className="aspect-[16/9] overflow-hidden">
              <img
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                src={post.coverImage}
              />
            </div>
          </div>
        )}
        <div className="flex flex-1 flex-col p-5 md:p-6">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 font-medium text-brand text-xs"
                key={tag}
              >
                <TagIcon className="size-2.5" />
                {tag}
              </span>
            ))}
            <span className="inline-flex items-center rounded-full border border-divide bg-white/5 px-2 py-0.5 font-medium text-white/50 text-xs">
              Featured
            </span>
          </div>
          <h2 className="mb-2 font-semibold text-lg text-white leading-snug tracking-tight transition-colors duration-200 group-hover:text-brand md:text-xl">
            {post.title}
          </h2>
          <p className="mb-4 line-clamp-2 flex-1 text-sm text-white/55 leading-relaxed">
            {post.description}
          </p>
          <div className="flex items-center gap-4 border-divide border-t pt-3.5 text-white/40 text-xs">
            <span className="font-medium text-white/60">{post.author}</span>
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-3" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon className="size-3" />
              {post.readingTime}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ── Featured Side Card (compact, right side) ────────────────────
function FeaturedSideCard({ post }: { post: PostMeta }) {
  return (
    <Link className="group block" href={blogPostHref(post.slug)}>
      <article className="flex items-start gap-4 rounded-xl border border-divide bg-neutral-900/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/35 hover:bg-neutral-900/70 hover:shadow-black/8 hover:shadow-lg">
        {post.coverImage && (
          <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-divide md:size-24">
            <img
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              src={post.coverImage}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {post.tags.slice(0, 1).map((tag) => (
              <span
                className="inline-flex items-center rounded-full bg-brand/10 px-1.5 py-0.5 font-medium text-brand text-[10px]"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
          <h3 className="mb-1.5 font-medium text-sm text-white leading-snug transition-colors duration-200 group-hover:text-brand line-clamp-2">
            {post.title}
          </h3>
          <div className="flex items-center gap-2 text-white/35 text-[11px]">
            <span>{formatDate(post.date)}</span>
            <span>•</span>
            <span>{post.readingTime}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ── Compact list row (for phones — shows everything inline) ────
function ListRowCompact({ post }: { post: PostMeta }) {
  return (
    <Link className="group block border-divide border-b py-3 transition-colors hover:bg-white/[0.015]" href={blogPostHref(post.slug)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/80 leading-snug transition-colors group-hover:text-brand line-clamp-2">
            {post.title}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            {formatListDate(post.date)} · {getCategoryLabel(post.category)} · {post.author}
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-white/30">
          {post.readingTime}
        </span>
      </div>
    </Link>
  );
}

// ── Main Page Component ─────────────────────────────────────────
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category ?? "all";
  const query = params.q ?? "";

  const posts = getAllPostMetas();

  // Filter
  let filteredPosts = posts;
  if (activeCategory !== "all") {
    filteredPosts = filteredPosts.filter((p) => p.category === activeCategory);
  }
  if (query) {
    const q = query.toLowerCase();
    filteredPosts = filteredPosts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  // Sort by date
  const sorted = [...filteredPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <main className="avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-32 pb-10 md:pb-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/8 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-[90rem]">
          <div className="mb-2">
            <span className="font-medium text-brand text-xs uppercase tracking-widest">
              From the blog
            </span>
          </div>
          <h1 className="mb-3 font-semibold text-3xl text-white tracking-tight md:text-5xl">
            Thoughts & Updates
          </h1>
          <p className="max-w-xl text-sm text-white/50 leading-relaxed md:text-base">
            Insights on AI reasoning, learning science, product updates, and ideas from the Avenire team.
          </p>
        </div>
      </section>

      {/* ── FEATURED POSTS ──────────────────────────────────────── */}
      {(() => {
        const featured = [...posts]
          .filter((p) => p.featured)
          .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99));
        const main = featured[0] ?? null;
        const side = featured.slice(1, 3);

        if (!main) return null;

        return (
          <section className="px-4 pt-4 pb-6 md:pb-8">
            <div className="mx-auto max-w-[90rem]">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
                <FeaturedHeroCard post={main} />
                <div className="flex flex-col gap-3">
                  {side.map((p) => (
                    <FeaturedSideCard key={p.slug} post={p} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── CATEGORY FILTERS + SEARCH ─────────────────────────────── */}
      <div className="sticky top-0 z-40 border-divide border-y bg-neutral-950/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[90rem] px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.slug;
                const href = cat.slug === "all"
                  ? "/blog"
                  : `/blog?category=${cat.slug}` as Route;

                return (
                  <Link
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-brand text-[#1b2733]"
                        : "border border-divide bg-white/5 text-white/60 hover:border-brand/40 hover:text-white/90"
                    }`}
                    href={href}
                    key={cat.slug}
                  >
                    {cat.label}
                  </Link>
                );
              })}
            </div>

            {/* Search */}
            <form className="relative min-w-0 md:min-w-[260px]" method="GET">
              {activeCategory !== "all" && (
                <input name="category" type="hidden" value={activeCategory} />
              )}
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="size-4 text-white/35" />
              </div>
              <input
                className="w-full rounded-xl border border-divide bg-white/5 py-2 pl-9 pr-8 text-sm text-white placeholder-white/35 transition-colors focus:border-brand/40 focus:outline-none focus:ring-1 focus:ring-brand/20"
                defaultValue={query}
                name="q"
                placeholder="Search articles..."
                type="search"
              />
              {query && (
                <Link
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/35 hover:text-white/70"
                  href={activeCategory !== "all" ? `/blog?category=${activeCategory}` : "/blog"}
                >
                  <XIcon className="size-4" />
                </Link>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* ── ARTICLES LIST ─────────────────────────────────────────── */}
      <section className="px-4 py-8 md:py-12">
        <div className="mx-auto max-w-[90rem]">
          {/* Column headers (desktop) */}
          <div className="hidden border-divide border-b pb-3 md:flex md:items-center md:gap-6">
            <span className="shrink-0 text-xs font-medium text-white/30 uppercase tracking-widest md:w-[100px]">
              Date
            </span>
            <span className="shrink-0 text-xs font-medium text-white/30 uppercase tracking-widest">
              Category
            </span>
            <span className="flex-1 text-xs font-medium text-white/30 uppercase tracking-widest">
              Article
            </span>
            <span className="shrink-0 text-xs font-medium text-white/30 uppercase tracking-widest md:w-[140px]">
              Author
            </span>
            <span className="shrink-0 text-right text-xs font-medium text-white/30 uppercase tracking-widest md:w-[80px]">
              Read
            </span>
          </div>

          {/* Desktop list */}
          {sorted.length > 0 ? (
            <div className="hidden md:block">
              {sorted.map((post) => (
                <ListRow key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-white/40">
              <p className="text-sm">No articles found.</p>
            </div>
          )}

          {/* Mobile list */}
          {sorted.length > 0 ? (
            <div className="md:hidden">
              {sorted.map((post) => (
                <ListRowCompact key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-white/40 md:hidden">
              <p className="text-sm">No articles found.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
