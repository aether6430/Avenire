import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface PostMeta {
  author: string;
  category: string;
  coverImage?: string;
  date: string;
  description: string;
  featured?: boolean;
  featuredOrder?: number;
  readingTime: string;
  slug: string;
  tags: string[];
  title: string;
}

export interface Post extends PostMeta {
  content: string;
}

export const CATEGORIES = [
  { label: "All", slug: "all" },
  { label: "AI Learning", slug: "ai-learning" },
  { label: "Study Systems", slug: "study-systems" },
  { label: "Active Recall", slug: "active-recall" },
  { label: "Research", slug: "research" },
  { label: "Productivity", slug: "productivity" },
  { label: "Product Updates", slug: "product-updates" },
  { label: "Case Studies", slug: "case-studies" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const TAG_CATEGORY_MAP: Record<string, string> = {
  "AI Learning": "ai-learning",
  Apollo: "ai-learning",
  RAG: "research",
  Search: "research",
  Retrieval: "research",
  Architecture: "research",
  "Spaced Repetition": "study-systems",
  "Active Recall": "active-recall",
  "Study Techniques": "study-systems",
  "Study Tools": "study-systems",
  "Learning Systems": "study-systems",
  "Cognitive Science": "research",
  "Cognitive Load": "research",
  Metacognition: "research",
  "Note-Taking": "study-systems",
  "Active Learning": "active-recall",
  Productivity: "productivity",
  "Product Updates": "product-updates",
};

export function getCategoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags))
    return tags.filter((t): t is string => typeof t === "string");
  if (typeof tags === "string") return [tags];
  return [];
}

function ensureBlogDir() {
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }
}

function mapTagsToCategory(tags: string[]): string {
  for (const tag of tags) {
    const mapped = TAG_CATEGORY_MAP[tag];
    if (mapped) return mapped;
  }
  return "ai-learning";
}

export function getAllPostMetas(): PostMeta[] {
  ensureBlogDir();
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));

  return files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const fullPath = path.join(BLOG_DIR, filename);
      const raw = fs.readFileSync(fullPath, "utf-8");
      const { data, content } = matter(raw);
      const rt = readingTime(content);

      return {
        slug,
        title: data.title ?? "Untitled",
        description: data.description ?? "",
        date: data.date
          ? new Date(data.date).toISOString()
          : new Date().toISOString(),
        author: data.author ?? "Avenire Team",
        tags: normalizeTags(data.tags),
        readingTime: rt.text,
        coverImage: data.coverImage,
        featured: Boolean(data.featured),
        featuredOrder:
          typeof data.featuredOrder === "number"
            ? data.featuredOrder
            : undefined,
        category: mapTagsToCategory(normalizeTags(data.tags)),
      } satisfies PostMeta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): Post | null {
  ensureBlogDir();
  const fullPath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);
  const rt = readingTime(content);

  return {
    slug,
    title: data.title ?? "Untitled",
    description: data.description ?? "",
    date: data.date
      ? new Date(data.date).toISOString()
      : new Date().toISOString(),
    author: data.author ?? "Avenire Team",
    tags: normalizeTags(data.tags),
    readingTime: rt.text,
    coverImage: data.coverImage,
    featured: Boolean(data.featured),
    featuredOrder:
      typeof data.featuredOrder === "number" ? data.featuredOrder : undefined,
    content,
    category: mapTagsToCategory(normalizeTags(data.tags)),
  };
}

export function getAllSlugs(): string[] {
  ensureBlogDir();
  return fs
    .readdirSync(BLOG_DIR)
    .flatMap((fileName) =>
      fileName.endsWith(".mdx") ? [fileName.replace(/\.mdx$/, "")] : []
    );
}

function tagMatch(postTags: string[], queryTags: string[]): number {
  return postTags.filter((t) => queryTags.includes(t)).length;
}

export function getRelatedPosts(
  currentSlug: string,
  tags: string[],
  category: string,
  count: number = 3
): PostMeta[] {
  const all = getAllPostMetas().filter((p) => p.slug !== currentSlug);

  // Score by shared tags first, then same category
  const scored = all.map((post) => ({
    post,
    score:
      tagMatch(post.tags, tags) * 10 + (post.category === category ? 5 : 0),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.post);
}

export function getPopularPosts(count: number = 4): PostMeta[] {
  const all = getAllPostMetas();
  // Sort by featuredOrder (lower = more featured), then by date
  return [...all]
    .sort((a, b) => {
      const orderA = a.featuredOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.featuredOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, count);
}

export function getPostsByCategory(category: string): PostMeta[] {
  if (category === "all") return getAllPostMetas();
  return getAllPostMetas().filter((p) => p.category === category);
}

export function searchPosts(query: string): PostMeta[] {
  const q = query.toLowerCase();
  return getAllPostMetas().filter((post) => {
    const titleMatch = post.title.toLowerCase().includes(q);
    const descMatch = post.description.toLowerCase().includes(q);
    const tagMatch = post.tags.some((t) => t.toLowerCase().includes(q));
    // We can't easily search content without loading all posts
    // But for the static site, we'll also search the content
    const postData = getPostBySlug(post.slug);
    const contentMatch = postData?.content.toLowerCase().includes(q) ?? false;
    return titleMatch || descMatch || tagMatch || contentMatch;
  });
}
