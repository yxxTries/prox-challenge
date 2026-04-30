# Vulcan OmniPro 220 — Expert AI Assistant

A multimodal AI agent built for the Prox Founding Engineer Challenge. Every response is a live React application rendered in a sandboxed iframe — not chat bubbles, not markdown — a fully interactive component.

## Quick Start

```bash
git clone <your-fork>
cd prox-challenge
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm install
npm run dev            # http://localhost:3000
```

The extracted manual images and text are committed to the repo, so you don't need to run the extraction step. If you want to re-extract from scratch:

```bash
npm run extract-manual
```

## How It Works

### The Core Idea: Artifact-First UI

Instead of a traditional chat interface, every Claude response is rendered as a React component in a sandboxed iframe. The UI is a scrollable feed of these live components — each one tailored to the specific question asked.

```
User asks: "What polarity for TIG?"
                    ↓
Claude generates: <antartifact type="application/vnd.ant.react">
                    export default function Response() {
                      return <div>...SVG diagram + instructions...</div>
                    }
                  </antartifact>
                    ↓
Sandbox iframe: Babel transforms JSX → executes with React Runner → renders
```

### Reverse-Engineered Claude Artifacts

The artifact system reverse-engineers how Claude.ai renders artifacts:

- Claude wraps responses in `<antartifact identifier="..." type="..." title="...">` tags
- The parent page streams the response and parses the artifact tag
- Each artifact renders in its own `<iframe src="/sandbox">` with `sandbox="allow-scripts allow-same-origin"`
- Code is passed via `window.postMessage({ type: 'render', code })`
- The sandbox page loads Babel standalone, React 18 (UMD), Tailwind CDN, and Lucide React
- Babel transforms JSX on the fly; `new Function()` executes it with React in scope

### Knowledge Extraction

Three PDFs → text + images:

1. **`npm run extract-manual`** runs `scripts/extract-manual.mjs` using [MuPDF](https://mupdf.com/)'s JavaScript bindings (pure WASM, no system dependencies)
2. Each PDF page is rendered to a 1.5x-scale PNG → saved to `public/manual-images/`
3. Full text is extracted with `page.toStructuredText().asText()`
4. Output: `lib/manual-content.js` (full text) and `lib/manual-images.js` (image manifest)

### System Prompt Design

The system prompt is ~130KB and contains:
- The complete manual text from all 3 PDFs (with page markers)
- A manifest of all 51 page images with their public URLs
- Strict instructions to ALWAYS respond with an `<antartifact>` tag
- Design guidelines: dark UI, Tailwind classes, SVG for diagrams, Lucide icons
- Examples of good response patterns for different question types

Claude is told: "Your response IS the artifact — there is no separate chat message."

### What Claude Can Do In Artifacts

Inside every sandbox, globally available:
- **React + all hooks** (useState, useEffect, useRef, etc.)
- **Tailwind CSS** (CDN) for styling
- **All Lucide React icons** (destructured onto `window`)
- **Manual page images** via `<img src="/manual-images/...png" />`

Claude generates:
- SVG diagrams for polarity setup and cable routing
- Interactive troubleshooting flowcharts (clickable steps with useState)
- Visual duty cycle tables with color-coded limits
- Rich cards with embedded manual page images
- Settings configurators for different welding scenarios

## Architecture

```
prox-challenge/
├── app/
│   ├── page.tsx              # Main UI: scrollable artifact feed + input bar
│   ├── sandbox/route.ts      # Serves the sandboxed iframe HTML page
│   ├── api/chat/route.ts     # Streaming Claude API endpoint (SSE)
│   └── layout.tsx
├── lib/
│   ├── system-prompt.ts      # Builds the 130KB system prompt
│   ├── manual-content.js     # Auto-generated: full manual text
│   └── manual-images.js      # Auto-generated: image manifest
├── public/
│   └── manual-images/        # 51 PNG files (one per manual page)
├── scripts/
│   └── extract-manual.mjs    # PDF extraction script (MuPDF)
└── files/
    ├── owner-manual.pdf
    ├── quick-start-guide.pdf
    └── selection-chart.pdf
```

## Design Decisions

**Why full manual in system prompt vs. RAG?**
The owner's manual is 48 pages — about 80KB of text. Claude's context window handles this easily. RAG introduces retrieval errors on a technical document where cross-referencing is common (e.g., duty cycle tables referencing process settings that are defined elsewhere). Full context is more accurate.

**Why artifacts for every response?**
Plain chat text can't show a polarity diagram, duty cycle calculator, or troubleshooting flowchart. Making every response an artifact means Claude thinks visually for every question — not just when it's obvious.

**Why MuPDF over pdf-parse + ImageMagick?**
MuPDF's JavaScript bindings are pure WASM — no system dependencies. Works on Windows, Mac, and Linux without installing ImageMagick or Ghostscript. The rendered page images are higher fidelity than extracted embedded images.

**Why Babel standalone in the sandbox?**
It's what the real Claude.ai artifacts system uses. It's battle-tested for this exact use case — transforming JSX strings to executable JavaScript in the browser at runtime.

## Tech Stack

- **Next.js 16** (App Router, streaming API routes)
- **Anthropic Claude SDK** (`claude-sonnet-4-6`)
- **MuPDF** (PDF text + image extraction)
- **Babel Standalone** (JSX transform in sandbox)
- **React 18 UMD** (sandbox runtime)
- **Tailwind CSS CDN** (sandbox styling)
- **Lucide React UMD** (sandbox icons)
- **TypeScript**
