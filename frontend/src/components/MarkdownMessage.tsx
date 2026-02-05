import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import type { SourcePointer } from "../utils/dataHandlerAPI";

type MarkdownMessageProps = {
  text: string;
  linkedCitations?: SourcePointer[];
};

export function MarkdownMessage({ text, linkedCitations }: MarkdownMessageProps) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      children={text}
      components={{
        a(props) {
          const { href, children } = props;
          const pointer = linkedCitations?.find((item) => item?.url && href && item.url === href);
          const snapshot = pointer?.text_snapshot?.trim();
          return (
            <span className="relative inline-flex items-center group">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-blue-500 hover:bg-slate-200"
              >
                {children}
              </a>
              {snapshot && (
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-700 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    Citation preview
                  </span>
                  <span className="block max-h-40 overflow-auto whitespace-pre-wrap leading-relaxed">
                    {snapshot}
                  </span>
                </span>
              )}
            </span>
          );
        },
        code(props) {
          const { children, className } = props;
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <SyntaxHighlighter PreTag="div" language={match[1]}>
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code className={className}>{children}</code>
          );
        },
      }}
    />
  );
}
