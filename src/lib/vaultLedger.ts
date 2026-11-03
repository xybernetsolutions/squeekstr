import { parseAbiItem, type PublicClient } from "viem";
import {
  VAULT,
  VAULT_DEPLOY_BLOCK,
  formatPower,
  vaultAbi,
} from "@/lib/contracts";

const depositedEvent = parseAbiItem(
  "event Deposited(address indexed depositor, uint256 indexed tokenId, uint256 indexed trackerId, uint8 level, uint256 power)",
);
const mergedEvent = parseAbiItem(
  "event Merged(uint256 indexed tipA, uint256 indexed tipB, uint256 indexed newTip, uint8 newLevel, uint256 protocolCut, uint256 communityBump)",
);

export type VaultDepositEvent = {
  kind: "deposit";
  blockNumber: bigint;
  txHash: `0x${string}`;
  depositor: string;
  tokenId: string;
  trackerId: string;
  level: number;
  powerDisplay: string;
};

export type VaultMergeEvent = {
  kind: "merge";
  blockNumber: bigint;
  txHash: `0x${string}`;
  tipA: string;
  tipB: string;
  newTip: string;
  newLevel: number;
};

export type VaultActivity = VaultDepositEvent | VaultMergeEvent;

/** Active tip NFT currently in the vault protocol (deposit ledger). */
export type LedgerTip = {
  tokenId: string;
  depositor: string;
  trackerId: string;
  level: number;
  powerDisplay: string;
  blockNumber: bigint;
  txHash: `0x${string}`;
  inVault: boolean;
  virginDeposit: boolean;
  soleDepositor: string;
};

export type VaultLedger = {
  activity: VaultActivity[];
  tips: LedgerTip[];
  /** tokenId → tip — full history including burned (inVault false) */
  byTokenId: Record<string, LedgerTip>;
};

type TipRow = {
  tokenId: string;
  depositor: string;
  trackerId: string;
  level: number;
  powerDisplay: string;
  blockNumber: bigint;
  txHash: `0x${string}`;
  inVault: boolean;
  virginDeposit: boolean;
  soleDepositor: string;
};

/**
 * Rebuild tip database from vault Deposited / Merged events.
 * On merge: tipA (other) is burned; newTip (kept) level becomes newLevel (e.g. L1→L2).
 */
export async function loadVaultLedger(
  publicClient: PublicClient,
): Promise<VaultLedger> {
  const latest = await publicClient.getBlockNumber();
  const fromBlock = VAULT_DEPLOY_BLOCK;

  const [depositLogs, mergeLogs] = await Promise.all([
    publicClient.getLogs({
      address: VAULT,
      event: depositedEvent,
      fromBlock,
      toBlock: latest,
    }),
    publicClient.getLogs({
      address: VAULT,
      event: mergedEvent,
      fromBlock,
      toBlock: latest,
    }),
  ]);

  const tipMap = new Map<string, TipRow>();

  const deposits: VaultDepositEvent[] = depositLogs.map((log) => {
    const tokenId = String(log.args.tokenId);
    const entry: VaultDepositEvent = {
      kind: "deposit",
      blockNumber: log.blockNumber ?? BigInt(0),
      txHash: log.transactionHash as `0x${string}`,
      depositor: log.args.depositor as string,
      tokenId,
      trackerId: String(log.args.trackerId),
      level: Number(log.args.level),
      powerDisplay: formatPower(log.args.power as bigint),
    };
    tipMap.set(tokenId, {
      tokenId,
      depositor: entry.depositor,
      trackerId: entry.trackerId,
      level: entry.level,
      powerDisplay: entry.powerDisplay,
      blockNumber: entry.blockNumber,
      txHash: entry.txHash,
      inVault: true,
      virginDeposit: true,
      soleDepositor: entry.depositor,
    });
    return entry;
  });

  // Chronological merges so level bumps apply in order
  const mergeLogsSorted = [...mergeLogs].sort((a, b) => {
    const ba = a.blockNumber ?? BigInt(0);
    const bb = b.blockNumber ?? BigInt(0);
    if (ba === bb) return 0;
    return ba < bb ? -1 : 1;
  });

  const merges: VaultMergeEvent[] = mergeLogsSorted.map((log) => {
    // Vault emits Merged(otherTip, myTip, myTip, newLevel, ...)
    // tipA = burned other · tipB/newTip = kept tip · newLevel = L+1
    const tipA = String(log.args.tipA);
    const tipB = String(log.args.tipB);
    const newTip = String(log.args.newTip);
    const newLevel = Number(log.args.newLevel);
    const blockNumber = log.blockNumber ?? BigInt(0);
    const txHash = log.transactionHash as `0x${string}`;

    const burned = tipMap.get(tipA);
    if (burned) {
      tipMap.set(tipA, { ...burned, inVault: false, blockNumber, txHash });
    }

    const kept = tipMap.get(newTip) ?? tipMap.get(tipB);
    if (kept) {
      if (kept.tokenId !== newTip) tipMap.delete(kept.tokenId);
      tipMap.set(newTip, {
        ...kept,
        tokenId: newTip,
        level: newLevel,
        blockNumber,
        txHash,
        inVault: true,
        virginDeposit: false,
      });
    } else {
      tipMap.set(newTip, {
        tokenId: newTip,
        depositor: "unknown",
        trackerId: "?",
        level: newLevel,
        powerDisplay: "?",
        blockNumber,
        txHash,
        inVault: true,
        virginDeposit: false,
        soleDepositor: "unknown",
      });
    }

    return {
      kind: "merge" as const,
      blockNumber,
      txHash,
      tipA,
      tipB,
      newTip,
      newLevel,
    };
  });

  // Confirm live inVault + level from contract tips() mapping
  const ids = [...tipMap.keys()];
  await Promise.all(
    ids.map(async (id) => {
      const row = tipMap.get(id);
      if (!row || !row.inVault) return;
      try {
        const onchain = (await publicClient.readContract({
          address: VAULT,
          abi: vaultAbi,
          functionName: "tips",
          args: [BigInt(id)],
        })) as readonly [
          bigint,
          number,
          bigint,
          bigint,
          boolean,
          boolean,
          `0x${string}`,
        ];
        const [, level, , communityPower, inVault, virginDeposit, soleDepositor] =
          onchain;
        tipMap.set(id, {
          ...row,
          level: Number(level),
          powerDisplay: formatPower(communityPower),
          inVault: Boolean(inVault),
          virginDeposit: Boolean(virginDeposit),
          soleDepositor: soleDepositor as string,
        });
      } catch {
        // keep event-derived row
      }
    }),
  );

  const activity: VaultActivity[] = [...deposits, ...merges].sort((a, b) =>
    a.blockNumber === b.blockNumber
      ? 0
      : a.blockNumber > b.blockNumber
        ? -1
        : 1,
  );

  const tips = [...tipMap.values()]
    .filter((t) => t.inVault)
    .sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));

  const byTokenId: Record<string, LedgerTip> = {};
  for (const [k, v] of tipMap) byTokenId[k] = v;

  return { activity, tips, byTokenId };
}

/** Same-level merge candidates for a kept tip (from ledger DB). */
export function sameLevelCandidates(
  tips: LedgerTip[],
  myTipTokenId: string,
  level: number,
  excludeTipIds?: Set<string>,
): LedgerTip[] {
  return tips.filter(
    (t) =>
      t.inVault &&
      t.level === level &&
      t.tokenId !== myTipTokenId &&
      !(excludeTipIds?.has(t.tokenId) ?? false),
  );
}
