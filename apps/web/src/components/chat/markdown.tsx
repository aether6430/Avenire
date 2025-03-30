import { marked } from 'marked';
import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkGFM from "remark-gfm";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@avenire/ui/components/table"
import { Separator } from "@avenire/ui/components/separator"
import "katex/dist/katex.min.css"

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map(token => token.raw);
}

const Code = (props: any) => {
  const { children, className, node, ...rest } = props
  const match = /language-(\w+)/.exec(className || "");
  return match ? (
    <code {...rest} className={className || ""}>
      {children}
    </code>
  ) : (
    <code {...rest} className={className || ""}>
      {children}
    </code>
  );
};

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return <ReactMarkdown

      // className="ai-msg text-base text-zinc-300 prose dark:prose-invert max-w-full flex flex-col [&>*:not(:nth-child(1))]:mt-5 text-md"
      remarkPlugins={[remarkMath, remarkGFM]}
      rehypePlugins={[rehypeKatex]}
      components={{
        ul: ({ children }) => <ul className="list-disc">{children}</ul>,
        table: ({ children }) => <Table>{children}</Table>,
        thead: ({ children }) => <TableHeader>{children}</TableHeader>,
        tr: ({ children }) => <TableRow>{children}</TableRow>,
        th: ({ children }) => (
          <TableHead className="text-left">{children}</TableHead>
        ),
        tbody: ({ children }) => <TableBody>{children}</TableBody>,
        td: ({ children }) => <TableCell>{children}</TableCell>,
        hr: () => <Separator />,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        h1: ({ children }) => (
          <h1 className="text-text text-4xl font-semibold">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-text text-xl font-semibold">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-text text-lg font-semibold">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-text text-md font-semibold">{children}</h4>
        ),
        code: ({ className, children }) => (
          <Code className={className || ""} >
            {children}
          </Code>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) { return false };
    return true;
  },
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

export const Markdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return blocks.map((block, index) => (
      <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
    ));
  },
);

Markdown.displayName = 'MemoizedMarkdown';