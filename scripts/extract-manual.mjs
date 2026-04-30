/**
 * Extracts text and page images from the 3 Vulcan OmniPro 220 PDFs.
 * Run with: node scripts/extract-manual.mjs
 */

import mupdf from "mupdf";
import { Jimp } from "jimp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const FILES_DIR = path.join(ROOT, "files");
const OUTPUT_IMG_DIR = path.join(ROOT, "public", "manual-images");
const OUTPUT_LIB_DIR = path.join(ROOT, "lib");

const PDFS = [
  { filename: "owner-manual.pdf", label: "Owner's Manual", prefix: "owner-manual" },
  { filename: "quick-start-guide.pdf", label: "Quick Start Guide", prefix: "quick-start" },
  { filename: "selection-chart.pdf", label: "Process Selection Chart", prefix: "selection-chart" },
];

// Pages with little text are diagrams (wiring, schematics, parts, control
// panels, assembly drawings); text-heavy pages get quoted verbatim instead.
const DIAGRAM_TEXT_THRESHOLD = 700;

// Static pixel crops at 1.5× render scale (893×1263 for Owner's Manual pages).
// Owner's Manual chrome zones (measured from raw renders):
//   top 82px  — dark section-header bar + tab strip (82px to clear it fully)
//   bottom 82px — footer strip: "Page N · For technical questions…" (81px zone)
//   left 75px  — chapter-tab sidebar (SAFETY/CONTROLS/WIRE/MIG/TIG alternating)
//   right 75px — chapter-tab sidebar (appears on right side on alternate pages)
// Quick Start / Selection Chart have no sidebar tabs — only small white margins.
const STATIC_CROPS = {
  "Owner's Manual":          { top: 82, bottom: 82, left: 75, right: 75 },
  "Quick Start Guide":       { top: 22, bottom: 22, left: 22, right: 22 },
  "Process Selection Chart": { top: 15, bottom: 15, left: 15, right: 15 },
};

// Extract the footer caption text (page number + "For technical questions" line)
// from raw page text so it can be displayed as a text caption beside the image.
function extractCaption(pageText, pdfLabel, pageNum) {
  if (pdfLabel !== "Owner's Manual") return null;

  // Look for "Page N" (the manual's own page number, not the PDF index)
  const pageMatch = pageText.match(/\bPage\s+(\d+)\b/i);
  const manualPageNum = pageMatch ? pageMatch[1] : String(pageNum);

  // Look for the "For technical questions" footer line
  const footerMatch = pageText.match(/For technical questions[^\n]*/i);
  const footer = footerMatch ? footerMatch[0].trim() : null;

  const parts = [`Page ${manualPageNum}`];
  if (footer) parts.push(footer);
  return parts.join(" · ");
}

async function cropPng(pngBuffer, sourceLabel) {
  // mupdf returns a Uint8Array; jimp needs a Node Buffer
  const buf = Buffer.isBuffer(pngBuffer) ? pngBuffer : Buffer.from(pngBuffer);
  const img = await Jimp.fromBuffer(buf);
  const crop = STATIC_CROPS[sourceLabel] ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  img.crop({
    x: crop.left,
    y: crop.top,
    w: w - crop.left - crop.right,
    h: h - crop.top - crop.bottom,
  });
  return await img.getBuffer("image/png");
}

async function extractPdf(pdfInfo) {
  const pdfPath = path.join(FILES_DIR, pdfInfo.filename);
  const data = fs.readFileSync(pdfPath);
  const doc = mupdf.Document.openDocument(data, "application/pdf");
  const pageCount = doc.countPages();

  console.log(`  ${pdfInfo.label}: ${pageCount} pages`);

  const allText = [];
  const images = [];

  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);

    // Extract text
    const structured = page.toStructuredText("preserve-whitespace");
    const pageText = structured.asText();
    allText.push(`--- ${pdfInfo.label} | Page ${i + 1} ---\n${pageText}`);

    const dense = pageText.replace(/\s+/g, "").length;
    const type = dense <= DIAGRAM_TEXT_THRESHOLD ? "diagram" : "text";

    // Render at 1.5× scale then apply static chrome-removal crop
    const matrix = mupdf.Matrix.scale(1.5, 1.5);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
    const rawPng = pixmap.asPNG();
    const croppedPng = await cropPng(rawPng, pdfInfo.label);

    const imgFilename = `${pdfInfo.prefix}-page-${String(i + 1).padStart(3, "0")}.png`;
    const imgPath = path.join(OUTPUT_IMG_DIR, imgFilename);
    fs.writeFileSync(imgPath, croppedPng);

    // Caption: the page-number and footer text stripped from the image
    const caption = extractCaption(pageText, pdfInfo.label, i + 1);

    images.push({
      filename: imgFilename,
      url: `/manual-images/${imgFilename}`,
      source: pdfInfo.label,
      page: i + 1,
      label: `${pdfInfo.label} — Page ${i + 1}`,
      type,
      caption,
    });

    process.stdout.write(`\r  Page ${i + 1}/${pageCount} rendered   `);
  }

  console.log("");
  return { text: allText.join("\n\n"), images };
}

async function main() {
  console.log("Extracting Vulcan OmniPro 220 manuals...\n");

  fs.mkdirSync(OUTPUT_IMG_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_LIB_DIR, { recursive: true });

  const allText = [];
  const allImages = [];

  for (const pdf of PDFS) {
    console.log(`Processing: ${pdf.label}`);
    const { text, images } = await extractPdf(pdf);
    allText.push(text);
    allImages.push(...images);
  }

  // Write plain data files — NOT JS modules.
  // system-prompt.ts reads these with fs.readFileSync so they never enter
  // the Next.js module graph and don't cause Turbopack compilation hangs.
  fs.writeFileSync(
    path.join(OUTPUT_LIB_DIR, "manual-content.txt"),
    allText.join("\n\n===\n\n")
  );
  console.log("Wrote lib/manual-content.txt");

  fs.writeFileSync(
    path.join(OUTPUT_LIB_DIR, "manual-images.json"),
    JSON.stringify(allImages, null, 2)
  );
  console.log("Wrote lib/manual-images.json");
  console.log(`\nDone! ${allImages.length} page images across ${PDFS.length} PDFs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
