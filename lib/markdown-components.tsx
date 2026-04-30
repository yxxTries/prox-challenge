/**
 * Custom React Markdown components for consistent rendering across the app.
 * Extracted from page.tsx to improve maintainability.
 */

import { isValidElement, ReactElement } from "react";
import ReactMarkdown from "react-markdown";

/**
 * Inline SVG component — renders SVG with responsive viewBox
 */
interface InlineSvgProps {
  content: string;
}

function InlineSvg({ content }: InlineSvgProps) {
  return (
    <div
      className="my-4 [&>svg]:w-full [&>svg]:block"
      dangerouslySetInnerHTML={{ __html: ensureViewBox(content) }}
    />
  );
}

/**
 * Inject viewBox attribute if missing so SVG scales properly
 */
function ensureViewBox(svg: string): string {
  if (/viewBox\s*=/i.test(svg)) return svg;
  const w = (/\bwidth="(\d+)"/.exec(svg) ?? [])[1];
  const h = (/\bheight="(\d+)"/.exec(svg) ?? [])[1];
  if (!w || !h) return svg;
  return svg.replace(/<svg\b/, `<svg viewBox="0 0 ${w} ${h}"`);
}

export const markdownComponents: Record<
  string,
  React.ComponentType<Record<string, any>>
> = {
  // Manual page images — suppressed; Claude now outputs reference links instead
  img: () => null,
  
  // Links — transform /manual-images/ to PDF URLs with page anchors
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    let finalHref = href;
    if (href?.startsWith("/manual-images/")) {
      // Transform /manual-images/owner-manual-page-008.png → /api/manual/owner-manual.pdf#page=8
      const match = href.match(/\/manual-images\/(.+?)-page-(\d+)\.png/);
      if (match) {
        const [, pdfName, pageNum] = match;
        finalHref = `/api/manual/${pdfName}.pdf#page=${parseInt(pageNum, 10)}`;
      }
      return (
        <a
          href={finalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800/60 hover:bg-slate-700/60 hover:border-amber-500/50 text-xs text-slate-300 hover:text-amber-300 transition-colors no-underline"
        >
          <svg
            className="w-3.5 h-3.5 flex-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {children}
        </a>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-400 underline hover:text-amber-300"
      >
        {children}
      </a>
    );
  },

  // Tables
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-slate-800">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left text-slate-300 font-semibold border border-slate-700">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 text-slate-300 border border-slate-700">
      {children}
    </td>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="even:bg-slate-800/40">{children}</tr>
  ),

  // Headers
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-lg font-bold text-slate-100 mt-5 mb-2">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-base font-bold text-amber-400 mt-4 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-slate-200 mt-3 mb-1">{children}</h3>
  ),

  // Paragraphs — detect raw SVG text nodes and render them directly
  p: ({
    children,
    node,
  }: {
    children?: React.ReactNode;
    node?: { children?: Array<{ type: string; value?: string }> };
  }) => {
    const raw = node?.children?.[0];
    if (raw?.type === "text" && raw.value?.trim().startsWith("<svg")) {
      return <InlineSvg content={raw.value.trim()} />;
    }
    return <p className="my-2 text-slate-300 leading-relaxed">{children}</p>;
  },

  // Fenced code blocks — intercept SVG content before <pre> wraps it
  pre: ({ children }: { children?: React.ReactNode }) => {
    const codeEl = Array.isArray(children)
      ? children.find(
          (c): c is ReactElement<{
            children?: React.ReactNode;
            className?: string;
          }> => isValidElement(c)
        )
      : isValidElement(children)
      ? (children as ReactElement<{
          children?: React.ReactNode;
          className?: string;
        }>)
      : undefined;

    if (codeEl) {
      const props = codeEl.props as {
        children?: React.ReactNode;
        className?: string;
      };
      const raw: string =
        typeof props.children === "string"
          ? props.children
          : String(props.children ?? "");
      const cls: string = props.className ?? "";
      if (cls === "language-svg" || raw.trim().startsWith("<svg")) {
        return <InlineSvg content={raw.trim()} />;
      }
    }
    return (
      <pre className="my-3 p-3 bg-slate-800/60 rounded-lg overflow-x-auto text-xs text-slate-300 font-mono border border-slate-700">
        {children}
      </pre>
    );
  },

  // Inline code
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="px-1.5 py-0.5 bg-slate-800 rounded text-amber-300 text-xs font-mono">
      {children}
    </code>
  ),

  // Bold
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-slate-100">{children}</strong>
  ),

  // Lists
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-2 ml-4 space-y-1 list-disc list-outside text-slate-300">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-2 ml-4 space-y-1 list-decimal list-outside text-slate-300">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),

  // Blockquote — used for warnings/notes
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 pl-3 border-l-2 border-amber-500 text-slate-400 italic">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-4 border-slate-700" />,
};

export { InlineSvg, ensureViewBox };
