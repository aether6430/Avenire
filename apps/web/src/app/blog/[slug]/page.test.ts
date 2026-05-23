import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { getAllSlugsMock, getPostBySlugMock, markdownMock } = vi.hoisted(() => ({
  getAllSlugsMock: vi.fn(() => ["introducing-avenire"]),
  getPostBySlugMock: vi.fn(),
  markdownMock: vi.fn(() => null),
}));

vi.mock("@/lib/blog", () => ({
  getAllSlugs: getAllSlugsMock,
  getPostBySlug: getPostBySlugMock,
}));

vi.mock("react-markdown", () => ({
  default: markdownMock,
}));

vi.mock("remark-gfm", () => ({
  default: {},
}));

vi.mock("remark-math", () => ({
  default: {},
}));

vi.mock("rehype-katex", () => ({
  default: {},
}));

import BlogPostPage, { generateMetadata } from "./page";

function findElementByType(node: ReactNode, type: unknown): ReactNode {
  if (!node) {
    return null;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementByType(child, type);
      if (match) {
        return match;
      }
    }
    return null;
  }

  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return null;
  }

  if (node.type === type) {
    return node;
  }

  return findElementByType(node.props.children, type);
}

describe("BlogPostPage", () => {
  it("keeps article metadata aligned with the visible blog post heading", async () => {
    getPostBySlugMock.mockReturnValue({
      author: "The Avenire Team",
      content: "# Introducing Avenire\n\nBody copy.\n\n## Next section",
      date: "2026-02-23T00:00:00.000Z",
      description: "Why we built Avenire.",
      readingTime: "1 min read",
      slug: "introducing-avenire",
      tags: ["AI Learning"],
      title:
        "Introducing Avenire: Interactive AI Learning That Builds Understanding",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "introducing-avenire" }),
    });

    expect(metadata.title).toBe(
      "Introducing Avenire: Interactive AI Learning That Builds Understanding | Avenire Blog"
    );
    expect(metadata.twitter?.title).toBe(
      "Introducing Avenire: Interactive AI Learning That Builds Understanding | Avenire Blog"
    );
    expect(String(metadata.openGraph?.images?.[0])).toContain(
      "/api/og?template=blog&title=Introducing+Avenire%3A+Interactive+AI+Learning+That+Builds+Understanding&category=AI+Learning&date=2026-02-23T00%3A00%3A00.000Z&readingTime=1+min+read"
    );
  });

  it("strips a leading markdown h1 before rendering the article body", async () => {
    getPostBySlugMock.mockReturnValue({
      author: "The Avenire Team",
      content: "# Introducing Avenire\n\nBody copy.\n\n## Next section",
      date: "2026-02-23T00:00:00.000Z",
      description: "Why we built Avenire.",
      readingTime: "1 min read",
      slug: "introducing-avenire",
      tags: ["AI Learning"],
      title:
        "Introducing Avenire: Interactive AI Learning That Builds Understanding",
    });

    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "introducing-avenire" }),
    });

    const markdownElement = findElementByType(element, markdownMock);

    expect(markdownElement).not.toBeNull();
    expect((markdownElement as any).props.children).toBe(
      "Body copy.\n\n## Next section"
    );
  });

  it("renders markdown lists with native list markers instead of forced dash prefixes", async () => {
    getPostBySlugMock.mockReturnValue({
      author: "The Avenire Team",
      content: "# Introducing Avenire\n\n- Bullet\n\n1. Ordered",
      date: "2026-02-23T00:00:00.000Z",
      description: "Why we built Avenire.",
      readingTime: "1 min read",
      slug: "introducing-avenire",
      tags: ["AI Learning"],
      title:
        "Introducing Avenire: Interactive AI Learning That Builds Understanding",
    });

    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "introducing-avenire" }),
    });

    const markdownElement = findElementByType(element, markdownMock) as any;
    const components = markdownElement.props.components;

    const unorderedList = components.ul({ children: null });
    const orderedList = components.ol({ children: null });
    const listItem = components.li({ children: null });

    expect(unorderedList.props.className).toContain("list-disc");
    expect(unorderedList.props.className).toContain("marker:text-brand");
    expect(orderedList.props.className).toContain("list-decimal");
    expect(listItem.props.className).not.toContain("before:content");
  });
});
