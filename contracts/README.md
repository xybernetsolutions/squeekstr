# SqkstrVault (Sepolia)

Live vault: `0x67f25Acec84c7b1A0AFC3879A1ae4227178a83e5`  
Tracker NFT: `0x8f4483e90ade9b2b4950dfa841c877b5d3bf969d`

## Deploy

```bash
npm run vault:compile
PRIVATE_KEY=0x... npm run vault:deploy
```

Then call `tracker.setVault(NEW_VAULT)` as tracker owner and update `VAULT` in `src/lib/contracts.ts`.
