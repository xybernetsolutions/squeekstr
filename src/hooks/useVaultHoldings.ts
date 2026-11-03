"use client";

import { useQuery } from "@tanstack/react-query";
import { VAULT } from "@/lib/contracts";
import { fetchSqueekAccount, fetchSqueekToken } from "@/lib/squeekchain";

export type VaultTip = {
  tokenId: string;
  level: number;
  power: number;
  mergeState: string | null;
  nextMergeHeight: string | null;
  image: string | null;
};

type AccountPayload = {
  tokens?: Array<{
    tokenId?: string | number;
    id?: string | number;
    custody?: string;
    level?: number;
    power?: string | number;
    basePower?: string | number;
    mergeState?: string;
    nextMergeHeight?: string | number;
  }>;
  tokenCounts?: { staking?: string; wallet?: string };
};

async function tipImage(tokenId: string): Promise<string | null> {
  try {
    const result = await fetchSqueekToken(tokenId);
    if (!result.ok) return null;
    const meta = (
      result.data as {
        metadata?: {
          status?: string;
          imageDataUri?: string;
          cardImageUrl?: string;
        };
      }
    ).metadata;
    if (!meta || meta.status !== "available") return null;
    return meta.cardImageUrl ?? meta.imageDataUri ?? null;
  } catch {
    return null;
  }
}

/**
 * Tips deposited through the vault — from Squeekchain account API:
 * GET /v1/accounts/{VAULT} where custody === "staking".
 */
async function fetchVaultTips(): Promise<VaultTip[]> {
  const result = await fetchSqueekAccount(VAULT);
  if (!result.ok) {
    throw new Error(`Vault account API ${result.status}`);
  }

  const data = result.data as AccountPayload;
  const raw = Array.isArray(data.tokens) ? data.tokens : [];

  const staked = raw
    .filter((t) => String(t.custody ?? "").toLowerCase() === "staking")
    .map((t) => {
      const tokenId = String(t.tokenId ?? t.id ?? "");
      const power = Number(t.power ?? t.basePower ?? 0);
      const nextH = t.nextMergeHeight;
      return {
        tokenId,
        level: Number(t.level ?? 1),
        power: Number.isFinite(power) ? power : 0,
        mergeState: t.mergeState ?? null,
        nextMergeHeight:
          nextH === undefined || nextH === null ? null : String(nextH),
      };
    })
    .filter((t) => t.tokenId);

  return Promise.all(
    staked.map(async (t) => ({
      ...t,
      image: await tipImage(t.tokenId),
    })),
  );
}

/** All tip NFTs the vault currently has in staking (API-indexed). */
export function useVaultHoldings() {
  const query = useQuery({
    queryKey: ["vault-holdings", VAULT],
    staleTime: 15_000,
    refetchInterval: 20_000,
    queryFn: fetchVaultTips,
  });

  return {
    tips: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
