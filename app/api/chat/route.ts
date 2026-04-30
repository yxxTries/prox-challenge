import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/system-prompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Build once at module init — not on first request — so it's ready immediately.
const SYSTEM_PROMPT = buildSystemPrompt();

// Split system prompt into two parts for optimal caching:
// 1. GUIDELINES_SECTION (~10KB): Rarely changes, sent without cache control
// 2. MANUAL_SECTION (~120KB): Stable content, cached for 5 minutes
// This reduces token usage by ~70% on cached requests
const SPLIT_IDX = SYSTEM_PROMPT.indexOf("## VULCAN OMNIPRO 220 — COMPLETE MANUAL CONTENT");
const GUIDELINES_SECTION = SYSTEM_PROMPT.slice(0, SPLIT_IDX);
const MANUAL_SECTION = SYSTEM_PROMPT.slice(SPLIT_IDX);

// Improved model selection with weighted scoring
// Opus is better for complex SVG/diagram generation but costs more
// Sonnet is faster and cheaper for text-only responses
const SVG_SCORE_RULES = [
  { keywords: ["wiring", "wire up", "polarity", "cable", "socket"], weight: 10 },
  { keywords: ["hookup", "hook up", "connection", "connected"], weight: 8 },
  { keywords: ["diagram", "schematic"], weight: 6 },
  { keywords: ["electrode positive", "electrode negative", "dcen", "dcep"], weight: 9 },
];

function scoreSvgLikelihood(text: string): number {
  let score = 0;
  const lowerText = text.toLowerCase();

  for (const rule of SVG_SCORE_RULES) {
    for (const keyword of rule.keywords) {
      // Count keyword occurrences
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "g");
      const matches = lowerText.match(regex) || [];
      score += matches.length * rule.weight;
    }
  }

  return score;
}

function pickModel(messages: Array<{ role: string; content: string }>): string {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return "claude-sonnet-4-6";

  const score = scoreSvgLikelihood(lastUser.content);

  // Use Opus for high-confidence SVG questions (score > 15)
  // Use Sonnet for everything else (faster, cheaper)
  return score > 15 ? "claude-opus-4-7" : "claude-sonnet-4-6";
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
      // Guidelines: frequently used, don't cache
      { type: "text", text: GUIDELINES_SECTION },
      // Manual content: large & stable, cache for cost savings
      {
        type: "text",
        text: MANUAL_SECTION,
        cache_control: { type: "ephemeral" },
      },
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
