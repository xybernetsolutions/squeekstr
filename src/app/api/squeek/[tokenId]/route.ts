import { NextResponse } from "next/server";
import { fetchSqueekToken } from "@/lib/squeekchain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_RE = /^[1-9][0-9]{0,3}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await context.params;

  if (!TOKEN_RE.test(tokenId)) {
    return NextResponse.json({ error: "Invalid token id" }, { status: 400 });
  }

  try {
    const result = await fetchSqueekToken(tokenId);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Upstream error", detail: result.body.slice(0, 400) },
        { status: result.status >= 400 && result.status < 600 ? result.status : 502 },
      );
    }
    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json(
      { error: "Upstream fetch failed", detail: String(err) },
      { status: 502 },
    );
  }
}
