"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { VAULT, vaultAbi } from "@/lib/contracts";

export type TrackerReward = {
  trackerId: string;
  liveScore: string;
  claimable: string;
  claimableRaw: bigint;
  claimableEpochs: string[];
};

async function loadRewards(
  address: `0x${string}`,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any,
): Promise<{
  currentEpoch: string;
  claimableTotal: string;
  claimableTotalRaw: bigint;
  trackers: TrackerReward[];
}> {
  const [currentEpoch, count] = await Promise.all([
    publicClient.readContract({
      address: VAULT,
      abi: vaultAbi,
      functionName: "currentEpoch",
    }) as Promise<bigint>,
    publicClient.readContract({
      address: VAULT,
      abi: vaultAbi,
      functionName: "trackerCount",
      args: [address],
    }) as Promise<bigint>,
  ]);

  const n = Number(count);
  const trackers: TrackerReward[] = [];
  let claimableTotalRaw = BigInt(0);

  for (let i = 0; i < n; i++) {
    const trackerId = (await publicClient.readContract({
      address: VAULT,
      abi: vaultAbi,
      functionName: "trackerIdOfOwner",
      args: [address, BigInt(i)],
    })) as bigint;

    const liveScore = (await publicClient.readContract({
      address: VAULT,
      abi: vaultAbi,
      functionName: "liveScore",
      args: [trackerId],
    })) as bigint;

    let claimableRaw = BigInt(0);
    const claimableEpochs: string[] = [];

    // Only finalized epochs (epochId < currentEpoch) can have pending SQK.
    for (let e = BigInt(0); e < currentEpoch; e++) {
      const already = (await publicClient.readContract({
        address: VAULT,
        abi: vaultAbi,
        functionName: "epochClaimed",
        args: [trackerId, e],
      })) as boolean;
      if (already) continue;

      const pending = (await publicClient.readContract({
        address: VAULT,
        abi: vaultAbi,
        functionName: "pending",
        args: [trackerId, e],
      })) as bigint;

      if (pending > BigInt(0)) {
        claimableRaw += pending;
        claimableEpochs.push(e.toString());
      }
    }

    claimableTotalRaw += claimableRaw;
    trackers.push({
      trackerId: trackerId.toString(),
      liveScore: formatUnits(liveScore, 18),
      claimable: formatUnits(claimableRaw, 18),
      claimableRaw,
      claimableEpochs,
    });
  }

  return {
    currentEpoch: currentEpoch.toString(),
    claimableTotal: formatUnits(claimableTotalRaw, 18),
    claimableTotalRaw,
    trackers,
  };
}

/** Claimable SQK + liveScore for the connected wallet's trackers. */
export function useSqkRewards() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["sqk-rewards", address],
    enabled: Boolean(address && publicClient),
    staleTime: 10_000,
    refetchInterval: 20_000,
    queryFn: () => loadRewards(address!, publicClient!),
  });

  const claimAll = useCallback(async () => {
    if (!address || !publicClient || !query.data) return;
    setClaimError(null);
    setClaiming(true);
    try {
      for (const t of query.data.trackers) {
        if (t.claimableEpochs.length === 0) continue;
        const hash = await writeContractAsync({
          address: VAULT,
          abi: vaultAbi,
          functionName: "claimEpochs",
          args: [
            BigInt(t.trackerId),
            t.claimableEpochs.map((e) => BigInt(e)),
          ],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await queryClient.invalidateQueries({ queryKey: ["sqk-rewards", address] });
    } catch (err) {
      setClaimError(
        err instanceof Error
          ? err.message.split("\n")[0] ?? "Claim failed"
          : "Claim failed",
      );
    } finally {
      setClaiming(false);
    }
  }, [address, publicClient, query.data, queryClient, writeContractAsync]);

  return {
    isConnected,
    address,
    currentEpoch: query.data?.currentEpoch ?? "0",
    claimableTotal: query.data?.claimableTotal ?? "0",
    claimableTotalRaw: query.data?.claimableTotalRaw ?? BigInt(0),
    trackers: query.data?.trackers ?? [],
    isLoading: Boolean(address) && query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    claimAll,
    claiming,
    claimError,
  };
}
