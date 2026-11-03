export const SQUEEK_NFT =
  "0xcb98349c134ab983da5bfd80527dfe2552bdb70f" as const;

export const DEMO_HOLDER =
  "0x340c4Cdb74ea6cCf98592B9e63ee80f814673ad7" as const;

/** SqkstrVault — deposit / merge / claim (Sepolia)
 *  Current: mergeDeposited + WL claimStakingRewards + resetOpenEpochScores
 *  Prior: 0xe8eff5138d261244df4c2b0d20b4935c2b3aeb07
 *  Old OnlyKeeper: 0x31bb410adf99297913b38d60fa29f52897b08993
 */
export const VAULT =
  "0x67f25Acec84c7b1A0AFC3879A1ae4227178a83e5" as const;

/** Vault deploy block on Sepolia (for historical deposit logs) */
export const VAULT_DEPLOY_BLOCK = BigInt(12048402);

/** SqkstrTracker ERC-721 receipt (Sepolia) */
export const TRACKER_NFT =
  "0x8f4483e90ade9b2b4950dfa841c877b5d3bf969d" as const;

export const TRACKER_BASE_URI =
  "https://squeekstr.netlify.app/api/tracker/" as const;

/** Power is stored scaled by 1e18 on-chain */
export const POWER_SCALE = BigInt("1000000000000000000");

export const erc721BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** Approval surface for SQUEEK → vault only (never staking). */
export const squeekApprovalAbi = [
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

export const vaultAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "trackerId", type: "uint256" }],
  },
  {
    type: "function",
    name: "merge",
    stateMutability: "nonpayable",
    inputs: [
      { name: "myTip", type: "uint256" },
      { name: "otherTip", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "canMergeTips",
    stateMutability: "view",
    inputs: [
      { name: "myTip", type: "uint256" },
      { name: "otherTip", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "trackerCount",
    stateMutability: "view",
    inputs: [{ name: "owner_", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "trackerIdOfOwner",
    stateMutability: "view",
    inputs: [
      { name: "owner_", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getTracker",
    stateMutability: "view",
    inputs: [{ name: "trackerId", type: "uint256" }],
    outputs: [
      { name: "owner_", type: "address" },
      { name: "power", type: "uint256" },
      { name: "rootTokenId", type: "uint256" },
      { name: "tipTokenId", type: "uint256" },
      { name: "rootLevel", type: "uint8" },
      { name: "tipLevel", type: "uint8" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "tips",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "tokenId", type: "uint256" },
      { name: "level", type: "uint8" },
      { name: "protocolShare", type: "uint256" },
      { name: "communityPower", type: "uint256" },
      { name: "inVault", type: "bool" },
      { name: "virginDeposit", type: "bool" },
      { name: "soleDepositor", type: "address" },
    ],
  },
  {
    type: "function",
    name: "pending",
    stateMutability: "view",
    inputs: [
      { name: "trackerId", type: "uint256" },
      { name: "epochId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "liveScore",
    stateMutability: "view",
    inputs: [{ name: "trackerId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "epochClaimed",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "trackerId", type: "uint256" },
      { name: "epochId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimEpochs",
    stateMutability: "nonpayable",
    inputs: [
      { name: "trackerId", type: "uint256" },
      { name: "epochIds", type: "uint256[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "currentEpoch",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "nextTrackerId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimed",
    stateMutability: "view",
    inputs: [{ name: "trackerId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalPower",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "protocolTrackerId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "accountedPower",
    stateMutability: "view",
    inputs: [{ name: "trackerId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "sqk",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "depositor", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "trackerId", type: "uint256", indexed: true },
      { name: "level", type: "uint8", indexed: false },
      { name: "power", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Merged",
    inputs: [
      { name: "tipA", type: "uint256", indexed: true },
      { name: "tipB", type: "uint256", indexed: true },
      { name: "newTip", type: "uint256", indexed: true },
      { name: "newLevel", type: "uint8", indexed: false },
      { name: "protocolCut", type: "uint256", indexed: false },
      { name: "communityBump", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TrackerBurned",
    inputs: [
      { name: "trackerId", type: "uint256", indexed: true },
      { name: "tipTokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

export const trackerAbi = [
  {
    type: "function",
    name: "getPosition",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "tipNft", type: "uint256" },
      { name: "level", type: "uint8" },
      { name: "power_", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export function formatPower(raw: bigint): string {
  const whole = raw / POWER_SCALE;
  const frac = raw % POWER_SCALE;
  if (frac === BigInt(0)) return whole.toString();
  const decimals = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${decimals}`;
}
