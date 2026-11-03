import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_RE = /^[1-9][0-9]{0,9}$/;

async function loadTrackerPng(origin: string): Promise<Buffer> {
  // Prefer disk (local + traced builds), then static public URL (Netlify).
  try {
    return await readFile(
      path.join(process.cwd(), "public", "images", "tracker.png"),
    );
  } catch {
    const res = await fetch(`${origin}/images/tracker.png`, {
      cache: "force-cache",
    });
    if (!res.ok) {
      throw new Error(`tracker.png missing (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}

/**
 * Tracker NFT image for mint / tokenURI.
 * Asset: public/images/tracker.png — keep this file.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await context.params;
  if (!TOKEN_RE.test(tokenId)) {
    return NextResponse.json({ error: "Invalid token id" }, { status: 400 });
  }

  try {
    const origin = new URL(request.url).origin;
    const buf = await loadTrackerPng(origin);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "tracker.png missing", detail: String(err) },
      { status: 500 },
    );
  }
}
