"use client";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/cn";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

function headingClassName(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const base = "font-title text-carbon";

  switch (level) {
    case 1:
      return cn(base, "text-2xl leading-tight");
    case 2:
      return cn(base, "text-xl leading-tight");
    case 3:
      return cn(base, "text-lg leading-tight");
    case 4:
      return cn(base, "text-base leading-tight");
    case 5:
    case 6:
      return cn(base, "text-sm leading-tight");
  }
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className={headingClassName(1)}>{children}</h1>,
          h2: ({ children }) => <h2 className={headingClassName(2)}>{children}</h2>,
          h3: ({ children }) => <h3 className={headingClassName(3)}>{children}</h3>,
          h4: ({ children }) => <h4 className={headingClassName(4)}>{children}</h4>,
          h5: ({ children }) => <h5 className={headingClassName(5)}>{children}</h5>,
          h6: ({ children }) => <h6 className={headingClassName(6)}>{children}</h6>,
          p: ({ children }) => <p className="text-sm leading-7 text-carbon">{children}</p>,
          hr: () => <hr className="my-4 border-line" />,
          strong: ({ children }) => <strong className="font-label text-carbon">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-carbon">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-carbon">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-7 text-carbon">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-line pl-4 text-sm leading-7 text-graphite">{children}</blockquote>
          ),
          code: ({ children, className }) => (
            <code className={cn("rounded-pill bg-paper px-1.5 py-0.5 font-mono text-[0.85em] text-carbon", className)}>
              {children}
            </code>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
