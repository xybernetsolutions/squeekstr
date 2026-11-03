"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import {
  TRACKER_BASE_URI,
  TRACKER_NFT,
  VAULT,
  formatPower,
  trackerAbi,
  vaultAbi,
} from "@/lib/contracts";
import { fetchSqueekToken } from "@/lib/squeekchain";

export type HeldTracker = {
  trackerId: string;
  tipTokenId: string;
  tipLevel: number;
  powerRaw: bigint;
  powerDisplay: string;
  /** Tracker receipt art (baseURI) */
  image: string;
  /** Parent tip SQUEEK art */
  tipImage: string | null;
  tipPower: number | null;
  active: boolean;
};

async function tipMeta(tokenId: string): Promise<{
  image: string | null;
  power: number | null;
  level: number | null;
}> {
  try {
    const result = await fetchSqueekToken(tokenId);
    if (!result.ok) return { image: null, power: null, level: null };
    const data = result.data as {
      level?: number;
      basePower?: string | number;
      power?: string | number;
      metadata?: {
        status?: string;
        imageDataUri?: string;
        cardImageUrl?: string;
      };
    };
    const meta = data.metadata;
    const image =
      meta?.status === "available"
        ? (meta.cardImageUrl ?? meta.imageDataUri ?? null)
        : null;
    const power = Number(data.power ?? data.basePower);
    return {
      image,
      power: Number.isFinite(power) ? power : null,
      level: data.level != null ? Number(data.level) : null,
    };
  } catch {
    return { image: null, power: null, level: null };
  }
}

async function fetchTrackers(
  address: `0x${string}`,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any,
): Promise<HeldTracker[]> {
  const count = await publicClient.readContract({
    address: VAULT,
    abi: vaultAbi,
    functionName: "trackerCount",
    args: [address],
  });

  const n = Number(count);
  if (!n) return [];

  const ids = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      publicClient.readContract({
        address: VAULT,
        abi: vaultAbi,
        functionName: "trackerIdOfOwner",
        args: [address, BigInt(i)],
      }),
    ),
  );

  const positions = await Promise.all(
    ids.map(async (trackerId: bigint) => {
      // Protocol tracker (#1) is vault-internal only — never minted as ERC-721.
      // Burned trackers also revert getPosition with InvalidToken (0xc1ab6dc1).
      let tipNft: bigint;
      let level: number;
      let power_: bigint;
      try {
        const pos = await publicClient.readContract({
          address: TRACKER_NFT,
          abi: trackerAbi,
          functionName: "getPosition",
          args: [trackerId],
        });
        tipNft = pos[0] as bigint;
        level = Number(pos[1]);
        power_ = pos[2] as bigint;
      } catch {
        return null;
      }

      if (tipNft === BigInt(0)) return null;

      let active = true;
      try {
        const g = await publicClient.readContract({
          address: VAULT,
          abi: vaultAbi,
          functionName: "getTracker",
          args: [trackerId],
        });
        active = Boolean(g[6]);
      } catch {
        // ignore
      }

      const tipTokenId = tipNft.toString();
      const powerDisplay = formatPower(power_);
      const idStr = trackerId.toString();
      const image = `${TRACKER_BASE_URI}${idStr}/image?level=${level}&power=${encodeURIComponent(powerDisplay)}`;
      const tip = await tipMeta(tipTokenId);

      return {
        trackerId: idStr,
        tipTokenId,
        tipLevel: tip.level ?? level,
        powerRaw: power_,
        powerDisplay,
        image,
        tipImage: tip.image,
        tipPower: tip.power,
        active,
      } satisfies HeldTracker;
    }),
  );

  return positions.filter((t): t is HeldTracker => t != null && t.active);
}

export function useHeldTrackers() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const query = useQuery({
    queryKey: ["held-trackers", address],
    enabled: Boolean(address && publicClient),
    staleTime: 15_000,
    queryFn: () => fetchTrackers(address!, publicClient!),
  });

  return {
    address,
    isConnected,
    trackers: query.data ?? [],
    isLoading: Boolean(address) && query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
