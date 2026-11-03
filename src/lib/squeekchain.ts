const BASE = "https://api.squeekchain.com/v1";

export type UpstreamResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; body: string };

async function getJson(url: string): Promise<UpstreamResult> {
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }
  try {
    return { ok: true, data: JSON.parse(body) as unknown };
  } catch {
    return { ok: false, status: 502, body: body.slice(0, 400) };
  }
}

type AccountPage = {
  tokens?: unknown[];
  nextCursor?: string | null;
  [key: string]: unknown;
};

/** Paginate account holdings (limit=100, follow nextCursor). */
export async function fetchSqueekAccount(address: string): Promise<UpstreamResult> {
  const addr = address.toLowerCase();
  const allTokens: unknown[] = [];
  let cursor: string | null = null;
  let firstPage: AccountPage | null = null;

  for (let i = 0; i < 20; i++) {
    const params = new URLSearchParams({ limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const result = await getJson(`${BASE}/accounts/${addr}?${params}`);
    if (!result.ok) return result;

    const page = result.data as AccountPage;
    if (firstPage === null) firstPage = page;

    if (Array.isArray(page.tokens)) {
      allTokens.push(...page.tokens);
    }

    cursor = typeof page.nextCursor === "string" ? page.nextCursor : null;
    if (!cursor) break;
  }

  if (!firstPage) {
    return { ok: false, status: 502, body: "empty response" };
  }

  return {
    ok: true,
    data: { ...firstPage, tokens: allTokens, nextCursor: null },
  };
}

export async function fetchSqueekToken(tokenId: string): Promise<UpstreamResult> {
  return getJson(`${BASE}/squeeks/${tokenId}`);
}
