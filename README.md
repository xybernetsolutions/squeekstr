# SQUEEKSTR

Permissionless experiments with SQUEEK — Sepolia vault UI for deposits, merges, and SQK rewards.

**Live:** [https://sqkstr.xyz](https://sqkstr.xyz)

squeekchain-project: ee83d7e9-6261-4605-835e-91a01f6af89e

## Stack

- Next.js 15 App Router + TypeScript + Tailwind
- RainbowKit + wagmi + viem (Sepolia)

## Run

```bash
npm install
npm run dev
```

Optional `.env.local` (see `.env.example`):

```
NEXT_PUBLIC_SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
```

## Contracts (Sepolia)

| Role | Address |
|------|---------|
| SqkstrVault | `0x67f25Acec84c7b1A0AFC3879A1ae4227178a83e5` |
| Tracker NFT | `0x8f4483e90ade9b2b4950dfa841c877b5d3bf969d` |
| SQUEEK NFT | `0xcb98349c134ab983da5bfd80527dfe2552bdb70f` |
| Staking proxy | `0x4b67b739dfd832f4eac67a7aa3bc244fb74cea4f` |

Source: `contracts/SqkstrVault.sol`
