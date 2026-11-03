import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const solc = require("solc");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourcePath = path.join(root, "contracts/SqkstrVault.sol");
const outDir = path.join(root, "contracts/out");

const source = fs.readFileSync(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: {
    "SqkstrVault.sol": { content: source },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors?.length) {
  for (const e of output.errors) {
    console.error(e.formattedMessage || e.message);
  }
  if (output.errors.some((e) => e.severity === "error")) {
    process.exit(1);
  }
}

const art = output.contracts["SqkstrVault.sol"].SqkstrVault;
if (!art?.evm?.bytecode?.object) {
  console.error("No bytecode produced");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const artifact = {
  contractName: "SqkstrVault",
  sourceName: "contracts/SqkstrVault.sol",
  abi: art.abi,
  bytecode: `0x${art.evm.bytecode.object}`,
  deployedBytecode: `0x${art.evm.deployedBytecode.object}`,
};
fs.writeFileSync(
  path.join(outDir, "SqkstrVault.json"),
  JSON.stringify(artifact, null, 2),
);
console.log(
  "Compiled SqkstrVault → contracts/out/SqkstrVault.json",
  `bytecode ${artifact.bytecode.length / 2 - 1} bytes`,
);
