"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { formatPower, VAULT, vaultAbi } from "@/lib/contracts";
import { fetchSqueekAccount } from "@/lib/squeekchain";
import { useVaultHoldings } from "@/hooks/useVaultHoldings";

type AccountRewards = {
  rewards?: {
    claimableBaseUnits?: string;
    lifetimePaidBaseUnits?: string;
  };
  power?: {
    nftPower?: string;
    sqkPower?: string;
  };
  tokenCounts?: { staking?: string; wallet?: string };
};

async function fetchVaultClaimable(): Promise<{
  claimableSqk: string;
  lifetimePaidSqk: string;
  apiNftPower: string | null;
  stakingCount: number;
}> {
  const result = await fetchSqueekAccount(VAULT);
  if (!result.ok) {
    throw new Error(`Vault account API ${result.status}`);
  }
  const data = result.data as AccountRewards;
  const claimable = data.rewards?.claimableBaseUnits ?? "0";
  const paid = data.rewards?.lifetimePaidBaseUnits ?? "0";
  const nftPower = data.power?.nftPower ?? null;
  const stakingCount = Number(data.tokenCounts?.staking ?? 0);
  return {
    claimableSqk: formatUnits(BigInt(claimable), 18),
    lifetimePaidSqk: formatUnits(BigInt(paid), 18),
    apiNftPower: nftPower
      ? formatPower(BigInt(nftPower))
      : null,
    stakingCount: Number.isFinite(stakingCount) ? stakingCount : 0,
  };
}

/** On-chain vault power + Squeekchain claimable for the vault depositor. */
export function useProtocolStats() {
  const publicClient = usePublicClient();
  const holdings = useVaultHoldings();

  const powerQ = useQuery({
    queryKey: ["vault-power", VAULT],
    enabled: Boolean(publicClient),
    staleTime: 15_000,
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!publicClient) throw new Error("No client");
      const [total, protocolId] = await Promise.all([
        publicClient.readContract({
          address: VAULT,
          abi: vaultAbi,
          functionName: "totalPower",
        }),
        publicClient.readContract({
          address: VAULT,
          abi: vaultAbi,
          functionName: "protocolTrackerId",
        }),
      ]);
      const protocolRaw = await publicClient.readContract({
        address: VAULT,
        abi: vaultAbi,
        functionName: "accountedPower",
        args: [protocolId],
      });
      const totalRaw = total as bigint;
      const protocolPower = protocolRaw as bigint;
      const userPower =
        totalRaw > protocolPower ? totalRaw - protocolPower : BigInt(0);
      return {
        totalPower: formatPower(totalRaw),
        userPower: formatPower(userPower),
        protocolPower: formatPower(protocolPower),
        protocolTrackerId: protocolId.toString(),
      };
    },
  });

  const claimQ = useQuery({
    queryKey: ["vault-staking-claimable", VAULT],
    staleTime: 15_000,
    refetchInterval: 20_000,
    queryFn: fetchVaultClaimable,
  });

  return {
    tips: holdings.tips,
    tipsLoading: holdings.isLoading,
    tipsError: holdings.error,
    power: powerQ.data ?? null,
    powerLoading: powerQ.isLoading,
    powerError: powerQ.error,
    claimable: claimQ.data ?? null,
    claimableLoading: claimQ.isLoading,
    claimableError: claimQ.error,
    refetch: async () => {
      await Promise.all([
        holdings.refetch(),
        powerQ.refetch(),
        claimQ.refetch(),
      ]);
    },
  };
}
