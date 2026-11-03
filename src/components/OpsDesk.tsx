"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { pageGutterClass } from "@/components/navChrome";
import { formatPower, VAULT, vaultAbi } from "@/lib/contracts";
import { fetchSqueekAccount } from "@/lib/squeekchain";

function formatSqk(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function OpsDesk() {
  const publicClient = usePublicClient();

  const statsQ = useQuery({
    queryKey: ["ops-desk", VAULT],
    enabled: Boolean(publicClient),
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!publicClient) throw new Error("No client");

      const [nextId, totalPower, account] = await Promise.all([
        publicClient.readContract({
          address: VAULT,
          abi: vaultAbi,
          functionName: "nextTrackerId",
        }) as Promise<bigint>,
        publicClient.readContract({
          address: VAULT,
          abi: vaultAbi,
          functionName: "totalPower",
        }) as Promise<bigint>,
        fetchSqueekAccount(VAULT),
      ]);

      if (!account.ok) {
        throw new Error(`Vault account API ${account.status}`);
      }

      const lifetimePaid =
        (account.data as { rewards?: { lifetimePaidBaseUnits?: string } })
          .rewards?.lifetimePaidBaseUnits ?? "0";

      const lastId = Number(nextId) - 1;
      let earning = 0;

      if (lastId > 0) {
        const ids = Array.from({ length: lastId }, (_, i) => BigInt(i + 1));
        const powers = await publicClient.multicall({
          contracts: ids.map((id) => ({
            address: VAULT,
            abi: vaultAbi,
            functionName: "accountedPower" as const,
            args: [id] as const,
          })),
          allowFailure: true,
        });

        for (const row of powers) {
          if (row.status === "success" && (row.result as bigint) > BigInt(0)) {
            earning += 1;
          }
        }
      }

      return {
        vaultClaimedSqk: formatUnits(BigInt(lifetimePaid), 18),
        trackersEarning: earning,
        totalMiningPower: formatPower(totalPower),
      };
    },
  });

  return (
    <div
      className={`flex min-h-[100dvh] items-center justify-center bg-[var(--surface)] py-16 text-[var(--ink)] ${pageGutterClass}`}
    >
      <div className="neu-panel w-full max-w-3xl px-8 py-10 sm:px-12 sm:py-14">
        <div className="mb-10 flex items-center justify-between gap-3 sm:mb-12">
          <p className="font-offbit text-xs uppercase tracking-[0.2em] text-[var(--ink)]/45 sm:text-sm">
            Vault desk
          </p>
          <button
            type="button"
            onClick={() => void statsQ.refetch()}
            className="font-offbit text-xs uppercase tracking-wider text-[var(--ink)] underline-offset-2 hover:underline sm:text-sm"
          >
            {statsQ.isFetching ? "…" : "Refresh"}
          </button>
        </div>

        {statsQ.isLoading ? (
          <p className="text-base text-[var(--ink)]/50">Loading…</p>
        ) : statsQ.error ? (
          <p className="text-base text-red-700">
            {(statsQ.error as Error).message}
          </p>
        ) : (
          <div className="space-y-10 sm:space-y-12">
            <div>
              <p className="font-offbit text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45 sm:text-sm">
                Total SQK claimed
              </p>
              <p className="mt-3 font-offbit text-5xl text-[var(--ink)] sm:text-6xl">
                {formatSqk(statsQ.data?.vaultClaimedSqk ?? "0")}
              </p>
            </div>

            <div className="border-t border-[var(--ink)]/10 pt-10 sm:pt-12">
              <p className="font-offbit text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45 sm:text-sm">
                Trackers earning
              </p>
              <p className="mt-3 font-offbit text-5xl text-[var(--ink)] sm:text-6xl">
                {statsQ.data?.trackersEarning ?? "—"}
              </p>
            </div>

            <div className="border-t border-[var(--ink)]/10 pt-10 sm:pt-12">
              <p className="font-offbit text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45 sm:text-sm">
                Total mining power
              </p>
              <p className="mt-3 font-offbit text-5xl text-[var(--ink)] sm:text-6xl">
                {statsQ.data?.totalMiningPower ?? "—"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
