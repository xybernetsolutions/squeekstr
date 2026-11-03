"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { SQUEEK_NFT, erc721BalanceAbi } from "@/lib/contracts";
import { fetchSqueekAccount, fetchSqueekToken } from "@/lib/squeekchain";

export type SqueekToken = {
  tokenId: string;
  custody?: string;
  level?: number;
  power?: number;
  image?: string | null;
  [key: string]: unknown;
};

type AccountPayload = {
  tokens?: SqueekToken[];
  nfts?: SqueekToken[];
  holdings?: SqueekToken[];
  data?: { tokens?: SqueekToken[] };
  tokenCounts?: { wallet?: string; staking?: string };
};

type TokenPayload = {
  metadata?: {
    status?: string;
    imageDataUri?: string;
    cardImageUrl?: string;
  };
};

function pickTokens(payload: AccountPayload): SqueekToken[] {
  const raw =
    payload.tokens ??
    payload.nfts ??
    payload.holdings ??
    payload.data?.tokens ??
    [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeToken(t: SqueekToken): SqueekToken {
  const id =
    t.tokenId ??
    (t as { token_id?: string }).token_id ??
    (t as { id?: string | number }).id;
  const basePower = (t as { basePower?: string | number }).basePower;
  return {
    ...t,
    tokenId: String(id ?? ""),
    custody: String(
      t.custody ?? (t as { Custody?: string }).Custody ?? "",
    ).toLowerCase(),
    power: t.power ?? (basePower != null ? Number(basePower) : undefined),
  };
}

async function fetchTokenImage(tokenId: string): Promise<string | null> {
  try {
    const result = await fetchSqueekToken(tokenId);
    if (!result.ok) return null;
    const data = result.data as TokenPayload;
    const meta = data.metadata;
    if (!meta || meta.status !== "available") return null;
    return meta.cardImageUrl ?? meta.imageDataUri ?? null;
  } catch {
    return null;
  }
}

async function stillOwnedBy(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any,
  owner: string,
  tokenId: string,
): Promise<boolean> {
  try {
    const onChainOwner = await publicClient.readContract({
      address: SQUEEK_NFT,
      abi: erc721BalanceAbi,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    });
    return (
      typeof onChainOwner === "string" &&
      onChainOwner.toLowerCase() === owner.toLowerCase()
    );
  } catch {
    // burned / not found → not in wallet
    return false;
  }
}

async function fetchWalletSqueeks(
  address: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any,
): Promise<SqueekToken[]> {
  const result = await fetchSqueekAccount(address);
  if (!result.ok) {
    throw new Error(`Account API ${result.status}`);
  }
  const data = result.data as AccountPayload;
  const candidates = pickTokens(data)
    .map(normalizeToken)
    .filter((t) => t.custody === "wallet" && t.tokenId);

  // Trust chain over Squeekchain indexer (deposit lag leaves stale "wallet" rows).
  const stillHeld = (
    await Promise.all(
      candidates.map(async (t) =>
        (await stillOwnedBy(publicClient, address, t.tokenId)) ? t : null,
      ),
    )
  ).filter((t): t is SqueekToken => t != null);

  const withArt = await Promise.all(
    stillHeld.map(async (t) => {
      const image = await fetchTokenImage(t.tokenId);
      return { ...t, image };
    }),
  );

  return withArt;
}

export function useHeldSqueeks() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const balanceQuery = useReadContract({
    address: SQUEEK_NFT,
    abi: erc721BalanceAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const accountQuery = useQuery({
    queryKey: ["squeek-account", address],
    queryFn: () => fetchWalletSqueeks(address!, publicClient!),
    enabled: Boolean(address && publicClient),
    staleTime: 10_000,
    retry: 1,
  });

  const balance = balanceQuery.data != null ? Number(balanceQuery.data) : null;

  return {
    address,
    isConnected,
    balance,
    tokens: accountQuery.data ?? [],
    isLoading:
      Boolean(address) && (balanceQuery.isLoading || accountQuery.isLoading),
    isFetching: accountQuery.isFetching || balanceQuery.isFetching,
    error: accountQuery.error ?? balanceQuery.error,
    refetch: async () => {
      await Promise.all([balanceQuery.refetch(), accountQuery.refetch()]);
    },
  };
}
