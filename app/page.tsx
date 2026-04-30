"use client";

import { useState, useRef, useEffect, useCallback, isValidElement, ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { WIDGET_REGISTRY, parseWidgetTag } from "@/components/interactive/registry";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "What's the duty cycle for MIG welding at 200A on 240V?",
  "I'm getting porosity in my flux-cored welds. What should I check?",
  "What polarity setup do I need for TIG welding?",
  "How do I set wire tension for MIG welding?",
  "What wire size for 1/4 inch steel?",
  "How do I switch between 120V and 240V input?",
];

// Split content into alternating markdown text, SVG, and Widget segments. SVG blocks
// bypass react-markdown entirely so the raw XML reaches dangerouslySetInnerHTML
// intact (markdown processing escapes/mangles it otherwise). Widget tags are
// self-closing markers that map to pre-built React components via WIDGET_REGISTRY.
type Segment = { type: "md" | "svg" | "widget"; content: string };

function processPlaceholders(content: string): string {
  const map = new Map<string, string>();
  const defRegex = /(\[Diagram[^\]]*\])[\s\n]*(<svg\b[\s\S]*?(?:<\/svg>|$))/gi;
  
  let m: RegExpExecArray | null;
  while ((m = defRegex.exec(content)) !== null) {
    map.set(m[1].trim(), m[2]);
  }

  let cleanContent = content.replace(defRegex, "");

  map.forEach((svgCode, label) => {
    const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeLabel, 'g');
    if (regex.test(cleanContent)) {
      cleanContent = cleanContent.replace(regex, `__SVG_START__\n${svgCode}\n__SVG_END__`);
    } else {
      cleanContent += `\n__SVG_START__\n${svgCode}\n__SVG_END__`;
    }
  });

  return cleanContent;
}

function splitContent(content: string): Segment[] {
  content = processPlaceholders(content);
  const segs: Segment[] = [];
  const re = /__SVG_START__([\s\S]*?)__SVG_END__|<svg\b[\s\S]*?<\/svg>|<Widget\b[^>]*\/>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) segs.push({ type: "md", content: content.slice(last, m.index) });
    const matched = m[0];
    if (/^<Widget\b/i.test(matched)) {
      segs.push({ type: "widget", content: matched });
    } else {
      segs.push({ type: "svg", content: m[1] ?? matched });
    }
    last = re.lastIndex;
  }
  if (last < content.length) {
    let tail = content.slice(last);
    // Hide any partial <svg ...> tail still streaming so XML doesn't leak as text
    const svgIdx = tail.search(/<svg\b/i);
    if (svgIdx !== -1) tail = tail.slice(0, svgIdx);
    // Same for partial <Widget ... /> tags — hide until the closing /> arrives
    const widgetIdx = tail.search(/<Widget\b/i);
    if (widgetIdx !== -1 && !/\/>/.test(tail.slice(widgetIdx))) tail = tail.slice(0, widgetIdx);
    segs.push({ type: "md", content: tail });
  }
  return segs;
}

// Render SVG blocks inline — Claude outputs raw SVG for wiring diagrams.
// Injects viewBox when missing so CSS width:100% scales the coordinate system
// rather than just stretching the element, which leaves the right side empty.
function ensureViewBox(svg: string): string {
  if (/viewBox\s*=/i.test(svg)) return svg;
  const w = (/\bwidth="(\d+)"/.exec(svg) ?? [])[1];
  const h = (/\bheight="(\d+)"/.exec(svg) ?? [])[1];
  if (!w || !h) return svg;
  return svg.replace(/<svg\b/, `<svg viewBox="0 0 ${w} ${h}"`);
}

function InlineSvg({ content }: { content: string }) {
  return (
    <div
      className="my-4 [&>svg]:w-full [&>svg]:block"
      dangerouslySetInnerHTML={{ __html: ensureViewBox(content) }}
    />
  );
}

function WidgetRenderer({ tag }: { tag: string }) {
  const { type, props } = parseWidgetTag(tag);
  const Component = WIDGET_REGISTRY[type];
  if (!Component) {
    return (
      <div className="my-3 px-3 py-2 rounded border border-slate-700 text-xs text-slate-500">
        Unsupported widget: <code>{type || "unknown"}</code>
      </div>
    );
  }
  return <Component {...props} />;
}

// Custom markdown components
const markdownComponents = {
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
          <svg className="w-3.5 h-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {children}
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-400 underline hover:text-amber-300">
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
  p: ({ children, node }: { children?: React.ReactNode; node?: { children?: Array<{ type: string; value?: string }> } }) => {
    const raw = node?.children?.[0];
    if (raw?.type === "text" && raw.value?.trim().startsWith("<svg")) {
      return <InlineSvg content={raw.value.trim()} />;
    }
    return <p className="my-2 text-slate-300 leading-relaxed">{children}</p>;
  },
  // Fenced code blocks — intercept SVG content before <pre> wraps it
  pre: ({ children }: { children?: React.ReactNode }) => {
    const codeEl = Array.isArray(children)
      ? children.find((c): c is ReactElement<{ children?: React.ReactNode; className?: string }> => isValidElement(c))
      : isValidElement(children) ? (children as ReactElement<{ children?: React.ReactNode; className?: string }>) : undefined;

    if (codeEl) {
      const props = codeEl.props as { children?: React.ReactNode; className?: string };
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

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-xl px-4 py-2.5 rounded-2xl rounded-tr-sm bg-amber-500/20 border border-amber-500/30 text-slate-200 text-sm leading-relaxed">
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="flex gap-3">
      {/* Avatar — amber-glow welder icon, matching the welcome screen */}
      <div className="flex-none w-7 h-7 mt-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_-6px_rgba(245,158,11,0.4)]">
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0 text-sm">
        {splitContent(content).map((seg, i) => {
          if (seg.type === "svg") return <InlineSvg key={i} content={seg.content} />;
          if (seg.type === "widget") return <WidgetRenderer key={i} tag={seg.content} />;
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm]}
              components={markdownComponents as Parameters<typeof ReactMarkdown>[0]["components"]}
            >
              {seg.content}
            </ReactMarkdown>
          );
        })}
        {streaming && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-amber-400 animate-pulse rounded-sm align-middle" />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = useCallback(
    async (question: string) => {
      if (!question.trim() || loading) return;

      const userText = question.trim();
      setInput("");
      setLoading(true);

      const updatedMessages: Message[] = [
        ...messages,
        { role: "user", content: userText },
      ];
      setMessages(updatedMessages);

      // Add streaming assistant placeholder
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", streaming: true },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const event = JSON.parse(raw);
              if (event.type === "delta") {
                accumulated += event.text;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = {
                    role: "assistant",
                    content: accumulated,
                    streaming: true,
                  };
                  return next;
                });
              } else if (event.type === "done") {
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = {
                    role: "assistant",
                    content: accumulated,
                    streaming: false,
                  };
                  return next;
                });
              }
            } catch {
              // skip malformed SSE
            }
          }
        }
      } catch (err) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: `Sorry, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}`,
            streaming: false,
          };
          return next;
        });
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  const isEmpty = messages.length === 0;

  const chatInput = (
    <div className="flex items-end gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 focus-within:border-amber-500/50 transition-colors shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)]">
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your Vulcan OmniPro 220..."
        rows={1}
        className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 resize-none outline-none text-sm leading-relaxed max-h-32 overflow-y-auto"
        style={{ fieldSizing: "content" } as React.CSSProperties}
        disabled={loading}
      />
      <button
        onClick={() => submit(input)}
        disabled={loading || !input.trim()}
        className="flex-none w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
      >
        {loading ? (
          <svg className="animate-spin w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        )}
      </button>
    </div>
  );

  if (isEmpty) {
    // Pre-conversation: blacked-out screen with floating welcome + chat field, ChatGPT-style.
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4">
        <div className="w-full max-w-xl flex flex-col items-center">
          {/* Welder icon */}
          <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5 shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)]">
            <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          {/* Welcome text */}
          <p className="text-base text-slate-300 text-center mb-8">
            Welcome to the Vulcan OmniPro 220 Manual, ask me anything
          </p>

          {/* Floating chat field */}
          <div className="w-full">{chatInput}</div>

          {/* Suggested questions */}
          <div className="w-full grid grid-cols-1 gap-2 mt-6">
            {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                className="text-left px-4 py-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-sm text-slate-400 hover:text-slate-100 transition-all"
              >
                {q}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-600 mt-6 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    );
  }

  // In-conversation: header + scrolling messages + bottom-anchored input.
  // Same blacked-out theme as the welcome screen.
  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header — minimal, same amber-glow icon as the welcome screen */}
      <header className="flex-none flex items-center justify-between px-6 py-3 bg-black/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_-8px_rgba(245,158,11,0.5)]">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-200">Vulcan OmniPro 220 Assistant</span>
        </div>
        <span className="text-xs text-slate-600">Powered by Claude</span>
      </header>

      {/* Message feed */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <UserMessage key={i} content={msg.content} />
            ) : (
              <AssistantMessage key={i} content={msg.content} streaming={msg.streaming} />
            )
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar (bottom-anchored once a conversation has started) */}
      <footer className="flex-none bg-black/60 backdrop-blur px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {chatInput}
          <p className="text-xs text-slate-600 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </footer>
    </div>
  );
}
