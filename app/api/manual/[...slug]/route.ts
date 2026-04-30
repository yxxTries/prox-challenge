import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const filename = slug.join("/");

  const filepath = join(process.cwd(), "files", filename);
  const filesDir = join(process.cwd(), "files");

  // Security: ensure the resolved path is within the files/ directory
  if (!filepath.startsWith(filesDir)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const content = readFileSync(filepath);
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
