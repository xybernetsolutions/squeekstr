"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { VAULT, vaultAbi } from "@/lib/contracts";

type Phase = "idle" | "checking" | "merging" | "confirming" | "done" | "error";

/**
 * vault.merge(myTip, otherTip) — keep mine, burn other.
 * On-chain enforces same-level + blocks same-depositor virgin×virgin.
 */
export function useMergeTips(onSuccess?: () => void) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const merge = useCallback(
    async (myTip: string, otherTip: string) => {
      if (!address || !publicClient) {
        setError("Connect a wallet first");
        setPhase("error");
        return;
      }
      if (myTip === otherTip) {
        setError("Pick two different tips");
        setPhase("error");
        return;
      }

      setError(null);
      try {
        const a = BigInt(myTip);
        const b = BigInt(otherTip);

        setPhase("checking");
        const ok = await publicClient.readContract({
          address: VAULT,
          abi: vaultAbi,
          functionName: "canMergeTips",
          args: [a, b],
        });
        if (!ok) {
          setError(
            "Cannot merge: need same tip level, and virgin×virgin from the same depositor is blocked.",
          );
          setPhase("error");
          return;
        }

        setPhase("merging");
        const hash = await writeContractAsync({
          address: VAULT,
          abi: vaultAbi,
          functionName: "merge",
          args: [a, b],
        });
        setPhase("confirming");
        await publicClient.waitForTransactionReceipt({ hash });
        setPhase("done");
        onSuccess?.();
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.split("\n")[0] ?? "Merge failed"
            : "Merge failed";
        // Live vault still routes through squeekMerge → OnlyKeeper (0xc60eb335).
        setError(
          /0xc60eb335|OnlyKeeper/i.test(msg)
            ? "Merge blocked: vault is not a SqueekMerge keeper. Redeploy vault that uses staking.mergeDeposited."
            : msg,
        );
        setPhase("error");
      }
    },
    [address, onSuccess, publicClient, writeContractAsync],
  );

  const busy =
    phase === "checking" || phase === "merging" || phase === "confirming";

  return {
    merge,
    phase,
    busy,
    error,
    reset: () => {
      setPhase("idle");
      setError(null);
    },
  };
}
