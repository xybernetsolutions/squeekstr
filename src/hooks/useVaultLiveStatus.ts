"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useBlockNumber,
  usePublicClient,
  useWatchContractEvent,
} from "wagmi";
import { VAULT, vaultAbi } from "@/lib/contracts";
import {
  loadVaultLedger,
  type LedgerTip,
  type VaultActivity,
} from "@/lib/vaultLedger";

export type {
  LedgerTip,
  VaultActivity,
  VaultDepositEvent,
  VaultMergeEvent,
} from "@/lib/vaultLedger";

/** Live vault deposit ledger — on-chain tip database from Deposited / Merged. */
export function useVaultLiveStatus() {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const [livePulse, setLivePulse] = useState(0);
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const query = useQuery({
    queryKey: ["vault-live-status", VAULT],
    enabled: Boolean(publicClient),
    staleTime: 8_000,
    refetchInterval: 20_000,
    queryFn: () => loadVaultLedger(publicClient!),
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["vault-live-status", VAULT] });
    void queryClient.invalidateQueries({ queryKey: ["vault-holdings", VAULT] });
    void queryClient.invalidateQueries({ queryKey: ["held-trackers"] });
    void queryClient.invalidateQueries({ queryKey: ["squeek-account"] });
    setLivePulse((n) => n + 1);
  }, [queryClient]);

  useWatchContractEvent({
    address: VAULT,
    abi: vaultAbi,
    eventName: "Deposited",
    onLogs: () => invalidate(),
  });

  useWatchContractEvent({
    address: VAULT,
    abi: vaultAbi,
    eventName: "Merged",
    onLogs: () => invalidate(),
  });

  const tips: LedgerTip[] = useMemo(
    () => query.data?.tips ?? [],
    [query.data?.tips],
  );

  const byLevel = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of tips) {
      map.set(t.level, (map.get(t.level) ?? 0) + 1);
    }
    return map;
  }, [tips]);

  const activity: VaultActivity[] = useMemo(
    () => query.data?.activity ?? [],
    [query.data?.activity],
  );

  return {
    tips,
    byTokenId: query.data?.byTokenId ?? {},
    activity,
    byLevel,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    blockNumber: blockNumber ?? null,
    livePulse,
    lastUpdated: query.dataUpdatedAt
      ? new Date(query.dataUpdatedAt)
      : null,
  };
}
