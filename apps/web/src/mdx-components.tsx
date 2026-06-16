import type { MDXComponents } from "mdx/types";
import Image, { type ImageProps } from "next/image";

/**
 * Global MDX Components
 *
 * This file provides custom React components for all MDX content in the app.
 * Components defined here are automatically available in every .mdx file
 * without explicit imports.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/mdx-components
 */

const components: MDXComponents = {
  // Customize heading styles
  h1: ({ children, ...props }) => (
    <h1
      className="mt-10 mb-4 font-semibold text-3xl text-white tracking-tight"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mt-10 mb-3 font-semibold text-2xl text-white tracking-tight"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-8 mb-3 font-semibold text-white text-xl" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="mt-6 mb-2 font-semibold text-white text-lg" {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 className="mt-4 mb-2 font-medium text-white text-base" {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 className="mt-4 mb-2 font-medium text-white/80 text-sm" {...props}>
      {children}
    </h6>
  ),

  // Paragraph
  p: (props) => (
    <p className="mb-5 text-white/70 leading-relaxed" {...props} />
  ),

  // Lists
  ul: (props) => (
    <ul className="my-4 ml-6 list-none space-y-2" {...props} />
  ),
  ol: (props) => (
    <ol className="my-4 ml-6 list-outside list-decimal space-y-2" {...props} />
  ),
  li: (props) => (
    <li
      className="pl-1 text-white/70 leading-relaxed before:mr-2 before:text-brand before:content-['—']"
      {...props}
    />
  ),

  // Links
  a: (props) => (
    <a
      className="text-brand underline underline-offset-4 transition-colors hover:text-brand/80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),

  // Text formatting
  strong: (props) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  em: (props) => (
    <em className="text-white/80 italic" {...props} />
  ),

  // Blockquote
  blockquote: (props) => (
    <blockquote
      className="my-6 border-brand/50 border-l-2 pl-5 text-white/55 italic"
      {...props}
    />
  ),

  // Code (inline)
  code: (props) => (
    <code
      className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-white/80 text-sm"
      {...props}
    />
  ),

  // Code block
  pre: (props) => (
    <pre
      className="my-6 overflow-x-auto rounded-xl border border-divide bg-neutral-900/55 p-5 font-mono text-sm leading-relaxed"
      {...props}
    />
  ),

  // Horizontal rule
  hr: () => <hr className="my-10 border-divide" />,

  // Images — uses Next.js Image for optimization
  img: ({ alt, ...props }) => (
    <Image
      alt={alt ?? ""}
      className="my-8 h-auto w-full rounded-xl border border-divide"
      height={900}
      sizes="(max-width: 768px) 100vw, 672px"
      width={1600}
      {...(props as Omit<ImageProps, "alt">)}
    />
  ),

  // Tables
  table: (props) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-divide">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => (
    <thead className="border-divide border-b bg-neutral-900/80" {...props} />
  ),
  tbody: (props) => <tbody {...props} />,
  tr: (props) => (
    <tr
      className="border-divide border-b last:border-b-0 even:bg-neutral-900/30"
      {...props}
    />
  ),
  th: (props) => (
    <th
      className="px-4 py-3 text-left font-semibold text-white/80 text-xs uppercase tracking-wider"
      {...props}
    />
  ),
  td: (props) => (
    <td className="px-4 py-3 text-white/70" {...props} />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
