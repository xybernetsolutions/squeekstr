"use client";

import { navBoxClass } from "@/components/navChrome";
import { useSqkRewards } from "@/hooks/useSqkRewards";
import { useAccount } from "wagmi";

function formatSqk(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** SQK amount + Claim as separate flex items (even nav gaps). */
export function HeaderSqkClaim() {
  const { isConnected } = useAccount();
  const rewards = useSqkRewards();

  const claimable =
    !isConnected || rewards.isLoading
      ? isConnected
        ? "…"
        : "0"
      : formatSqk(rewards.claimableTotal);
  const canClaim =
    isConnected &&
    !rewards.claiming &&
    !rewards.isLoading &&
    rewards.claimableTotalRaw > BigInt(0);

  return (
    <>
      <p className="font-offbit shrink-0 whitespace-nowrap text-[13px] uppercase tracking-[0.06em] text-[var(--ink)] md:text-[15px]">
        <span className="text-[var(--ink)]/55">SQK</span>{" "}
        <span className="text-[var(--ink)]">{claimable}</span>
      </p>
      <button
        type="button"
        disabled={!canClaim}
        onClick={() => void rewards.claimAll()}
        className={navBoxClass}
        title={
          rewards.claimError
            ? rewards.claimError
            : !isConnected
              ? "Connect wallet to claim"
              : rewards.currentEpoch === "0"
                ? "No epoch finalized yet"
                : "Claim pending SQK"
        }
      >
        {rewards.claiming ? "…" : "Claim"}
      </button>
    </>
  );
}
