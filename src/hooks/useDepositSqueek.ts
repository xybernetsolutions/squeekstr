"use client";

import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { SQUEEK_NFT, VAULT, squeekApprovalAbi, vaultAbi } from "@/lib/contracts";

type Phase = "idle" | "approving" | "depositing" | "confirming" | "done" | "error";

/** Send SQUEEK → vault. Only setApprovalForAll(vault); never staking / merge. */
export function useDepositSqueek(onSuccess?: () => void) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(
    async (tokenId: string) => {
      if (!address || !publicClient) {
        setError("Connect a wallet first");
        setPhase("error");
        return;
      }

      setError(null);
      setPendingId(tokenId);

      try {
        const id = BigInt(tokenId);

        const operatorOk = await publicClient.readContract({
          address: SQUEEK_NFT,
          abi: squeekApprovalAbi,
          functionName: "isApprovedForAll",
          args: [address, VAULT],
        });

        if (!operatorOk) {
          setPhase("approving");
          const approveHash = await writeContractAsync({
            address: SQUEEK_NFT,
            abi: squeekApprovalAbi,
            functionName: "setApprovalForAll",
            args: [VAULT, true],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        setPhase("depositing");
        const hash = await writeContractAsync({
          address: VAULT,
          abi: vaultAbi,
          functionName: "deposit",
          args: [id],
        });
        setPhase("confirming");
        await publicClient.waitForTransactionReceipt({ hash });
        setPhase("done");
        onSuccess?.();
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.split("\n")[0] ?? "Deposit failed"
            : "Deposit failed";
        setError(msg);
        setPhase("error");
      } finally {
        setPendingId(null);
      }
    },
    [address, onSuccess, publicClient, writeContractAsync],
  );

  const busy =
    phase === "approving" ||
    phase === "depositing" ||
    phase === "confirming";

  return {
    deposit,
    phase,
    pendingId,
    busy,
    error,
    reset: () => {
      setPhase("idle");
      setError(null);
    },
  };
}
