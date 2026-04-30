import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/system-prompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Build once at module init — not on first request — so it's ready immediately.
const SYSTEM_PROMPT = buildSystemPrompt();
const SPLIT_IDX = SYSTEM_PROMPT.indexOf("## VULCAN OMNIPRO 220 — COMPLETE MANUAL CONTENT");

// Diagram questions (wiring, polarity, cable routing, sockets) ask Claude
// for an inline SVG — those go to Opus for stronger SVG generation.
// Everything else stays on Sonnet for speed/cost.
const SVG_KEYWORDS = /\b(wiring|wire up|polarity|cable|socket|hookup|hook up|connect(ion|ed)?|diagram|schematic|electrode\s*positive|electrode\s*negative|dcen|dcep|reverse\s*polarity|straight\s*polarity)\b/i;

function pickModel(messages: Array<{ role: string; content: string }>): string {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (lastUser && SVG_KEYWORDS.test(lastUser.content)) {
    return "claude-opus-4-7";
  }
  return "claude-sonnet-4-6";
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Invalid messages", { status: 400 });
  }

  const stream = anthropic.messages.stream({
    model: pickModel(messages),
    max_tokens: 8096,
    system: [
      { type: "text", text: SYSTEM_PROMPT.slice(0, SPLIT_IDX) },
      { type: "text", text: SYSTEM_PROMPT.slice(SPLIT_IDX), cache_control: { type: "ephemeral" } },
    ],
    messages: messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    ),
  });

  // Stream raw text deltas as SSE
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({ type: "delta", text: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } else if (event.type === "message_stop") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
