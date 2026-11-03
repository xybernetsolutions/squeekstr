import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_RE = /^[1-9][0-9]{0,9}$/;

/**
 * ERC-721 metadata for tracker receipt mints.
 * tokenURI → https://squeekstr.netlify.app/api/tracker/{id}
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await context.params;
  if (!TOKEN_RE.test(tokenId)) {
    return NextResponse.json({ error: "Invalid token id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const level = url.searchParams.get("level") ?? "1";
  const power = url.searchParams.get("power") ?? "1000";
  // Prefer public site host so mint URIs stay stable across deploys.
  const forwarded = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = forwarded?.split(",")[0]?.trim();
  const origin =
    host && !host.includes("--")
      ? `${proto}://${host}`
      : "https://squeekstr.netlify.app";

  const imageQs = new URLSearchParams({ level, power });
  const image = `${origin}/api/tracker/${tokenId}/image?${imageQs}`;

  return NextResponse.json(
    {
      name: `SQUEEKSTR Tracker #${tokenId}`,
      description:
        "Tracker receipt NFT for SQUEEKSTR protocol deposits. Power entitles the holder to a share of SQK mining rewards.",
      image,
      external_url: origin,
      attributes: [
        { trait_type: "Level", value: Number(level) || 1 },
        { trait_type: "Power", value: Number(power) || 1000 },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
