# Vulcan OmniPro 220 Assistant

This app answers questions about the Vulcan OmniPro 220 and renders visual help.

## Claude agent ask and artifacts
When you ask a question, the app sends the ask to Claude with the system prompt. Claude replies with text plus SVG blocks and Widget tags. The UI detects those parts and renders them as interactive artifacts in the chat.

Claude can also include links to manual images. The renderer converts those links into direct PDF links served from /api/manual so you can open the exact manual page.

## Model switching
The chat endpoint scores the latest ask for wiring and polarity keywords. A high score uses Claude Opus for stronger diagrams. Otherwise it uses Claude Sonnet for faster and lower cost responses. The choice happens per request.

## What the LLM does for Vulcan
The LLM reads the full manual content and diagram manifest from the system prompt. It answers setup and troubleshooting questions and chooses the right mix of text, diagrams, and widgets.
