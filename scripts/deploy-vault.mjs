/**
 * Deploy fixed SqkstrVault (merge via staking.mergeDeposited).
 *
 * Usage:
 *   PRIVATE_KEY=0x... node scripts/deploy-vault.mjs
 *
 * After deploy, tracker owner must call:
 *   tracker.setVault(NEW_VAULT)
 *
 * Existing tips deposited on the old vault stay there (depositor = old vault).
 * New deposits go through the new vault once the frontend address + tracker vault are updated.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const artifactPath = path.join(root, "contracts/out/SqkstrVault.json");

const RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC ||
  process.env.SEPOLIA_RPC ||
  "https://ethereum-sepolia-rpc.publicnode.com";

const TRACKER = "0x8f4483e90ade9b2b4950dfa841c877b5d3bf969d";
const OLD_VAULT = "0x31bb410adf99297913b38d60fa29f52897b08993";

const sepolia = defineChain({
  id: 11155111,
  name: "sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const pk = process.env.PRIVATE_KEY?.trim();
if (!pk) {
  console.error("Set PRIVATE_KEY to deploy.");
  process.exit(1);
}
if (!fs.existsSync(artifactPath)) {
  console.error("Missing artifact. Run: node scripts/compile-vault.mjs");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const account = privateKeyToAccount(
  /** @type {`0x${string}`} */ (pk.startsWith("0x") ? pk : `0x${pk}`),
);
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC),
});
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC),
});

console.log("Deployer", account.address);
const hash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: [],
});
console.log("tx", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const address = receipt.contractAddress;
console.log("SqkstrVault deployed:", address);
console.log("gas used", receipt.gasUsed.toString());

fs.writeFileSync(
  path.join(root, "contracts/out/deployed-vault.json"),
  JSON.stringify(
    {
      address,
      txHash: hash,
      deployer: account.address,
      oldVault: OLD_VAULT,
      tracker: TRACKER,
      chainId: 11155111,
      deployedAt: new Date().toISOString(),
      nextSteps: [
        "As tracker owner, call tracker.setVault(NEW_VAULT)",
        "Update src/lib/contracts.ts VAULT to NEW_VAULT",
        "Redeploy frontend",
        "Existing tips on OLD_VAULT keep depositor=old vault; merge them on old vault only after keeper fix, or emergencyWithdraw+redeposit via new vault",
      ],
    },
    null,
    2,
  ),
);

// Show current tracker.vault binding
try {
  const current = await publicClient.readContract({
    address: TRACKER,
    abi: parseAbi(["function vault() view returns (address)"]),
    functionName: "vault",
  });
  console.log("tracker.vault currently:", current);
  console.log("→ tracker owner must setVault(", address, ")");
} catch (e) {
  console.warn("could not read tracker.vault", e.shortMessage || e.message);
}
