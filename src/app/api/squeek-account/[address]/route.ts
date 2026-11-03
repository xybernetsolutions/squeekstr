import { NextResponse } from "next/server";
import { fetchSqueekAccount } from "@/lib/squeekchain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> },
) {
  const { address } = await context.params;

  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const result = await fetchSqueekAccount(address);
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
