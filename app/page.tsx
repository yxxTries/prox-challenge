"use client";

import { useState, useRef, useEffect, useCallback, isValidElement, ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

// Split content into alternating markdown text and SVG segments. SVG blocks
// bypass react-markdown entirely so the raw XML reaches dangerouslySetInnerHTML
// intact (markdown processing escapes/mangles it otherwise).
type Segment = { type: "md" | "svg"; content: string };
function splitContent(content: string): Segment[] {
  const segs: Segment[] = [];
  const re = /<svg\b[\s\S]*?<\/svg>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) segs.push({ type: "md", content: content.slice(last, m.index) });
    segs.push({ type: "svg", content: m[0] });
    last = re.lastIndex;
  }
  if (last < content.length) {
    let tail = content.slice(last);
    // Hide any partial <svg ...> tail still streaming so XML doesn't leak as text
    const openIdx = tail.search(/<svg\b/i);
    if (openIdx !== -1) tail = tail.slice(0, openIdx);
    segs.push({ type: "md", content: tail });
  }
  return segs;
}

// Render SVG blocks inline — Claude outputs raw SVG for wiring diagrams
function InlineSvg({ content }: { content: string }) {
  return (
    <div className="my-4">
      <div
        className="rounded-lg overflow-hidden border border-slate-700"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <details className="mt-1">
        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 select-none">
          View SVG source
        </summary>
        <pre className="mt-2 text-xs text-slate-400 bg-slate-800/60 rounded p-2 overflow-x-auto">
          <code>{content}</code>
        </pre>
      </details>
    </div>
  );
}

// Custom markdown components
const markdownComponents = {
  // Manual page images — render large with rounded corners
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <figure className="my-4">
      <img
        src={src}
        alt={alt || "Manual reference"}
        className="rounded-lg border border-slate-700 w-full max-w-2xl"
        loading="lazy"
      />
      {alt && (
        <figcaption className="mt-1.5 text-xs text-slate-500 italic">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
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
  // Paragraphs — need to detect and render inline SVG
  p: ({ children, node }: { children?: React.ReactNode; node?: { children?: Array<{ type: string; value?: string; tagName?: string }> } }) => {
    // Check if this paragraph is just raw SVG
    const raw = node?.children?.[0];
    if (raw?.type === "text" && raw.value?.trim().startsWith("<svg")) {
      return <InlineSvg content={raw.value.trim()} />;
    }
    // If paragraph wraps only image(s), don't emit <p> — <figure> can't live inside <p>
    const onlyImages = node?.children?.every(
      c => (c.type === "element" && c.tagName === "img") ||
           (c.type === "text" && c.value?.trim() === "")
    );
    if (onlyImages) {
      return <>{children}</>;
    }
    return <p className="my-2 text-slate-300 leading-relaxed">{children}</p>;
  },
  // Fenced code blocks — intercept SVG content before <pre> wraps it
  pre: ({ children }: { children?: React.ReactNode }) => {
    const codeEl = Array.isArray(children)
      ? children.find((c): c is ReactElement => isValidElement(c))
      : isValidElement(children) ? (children as ReactElement) : undefined;

    if (codeEl) {
      const raw: string =
        typeof codeEl.props.children === "string"
          ? codeEl.props.children
          : String(codeEl.props.children ?? "");
      const cls: string = codeEl.props.className ?? "";
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
      {/* Avatar */}
      <div className="flex-none w-7 h-7 mt-0.5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0 text-sm">
        {splitContent(content).map((seg, i) =>
          seg.type === "svg" ? (
            <InlineSvg key={i} content={seg.content} />
          ) : (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm]}
              components={markdownComponents as Parameters<typeof ReactMarkdown>[0]["components"]}
            >
              {seg.content}
            </ReactMarkdown>
          )
        )}
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

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-200">Vulcan OmniPro 220 Assistant</span>
        </div>
        <span className="text-xs text-slate-500">Powered by Claude</span>
      </header>

      {/* Message feed */}
      <main className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Welcome / empty state */
          <div className="h-full flex flex-col items-center justify-center px-4 pb-8">
            <div className="w-full max-w-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-slate-100">Vulcan OmniPro 220</h1>
                <p className="text-sm text-slate-400">
                  Expert assistant with the full owner&apos;s manual, quick start guide, and process selection chart.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => submit(q)}
                    className="text-left px-4 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-sm text-slate-300 hover:text-slate-100 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
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
        )}
      </main>

      {/* Input bar */}
      <footer className="flex-none border-t border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-amber-500/50 transition-colors">
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
          <p className="text-xs text-slate-600 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </footer>
    </div>
  );
}
