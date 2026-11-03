import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN = "https://sqkstr.xyz";

/** Index for tracker mint URIs. */
export async function GET() {
  return NextResponse.json({
    name: "SQUEEKSTR Tracker metadata",
    mintUriPattern: `${ORIGIN}/api/tracker/{tokenId}`,
    imagePattern: `${ORIGIN}/api/tracker/{tokenId}/image?level={level}&power={power}`,
    example: `${ORIGIN}/api/tracker/1?level=3&power=1182.5`,
  });
}
