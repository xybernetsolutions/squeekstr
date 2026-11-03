"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  phantomWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
  zerionWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { mock } from "@wagmi/connectors";
import { DEMO_HOLDER } from "./contracts";
import { metaMaskExtensionWallet } from "./metaMaskExtensionWallet";

const rpc =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC ??
  "https://ethereum-sepolia-rpc.publicnode.com";

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

const wallets = [
  {
    groupName: "Popular",
    wallets: [
      metaMaskExtensionWallet,
      rainbowWallet,
      rabbyWallet,
      zerionWallet,
      phantomWallet,
      coinbaseWallet,
      injectedWallet,
      ...(wcProjectId
        ? [() => walletConnectWallet({ projectId: wcProjectId })]
        : []),
    ],
  },
];

const appConnectors = connectorsForWallets(wallets, {
  appName: "SQUEEKSTR",
  projectId: wcProjectId || "00000000000000000000000000000000",
});

/** Mock connector for Demo holder — always available, not shown in RainbowKit modal */
const demoHolderConnector = mock({
  accounts: [DEMO_HOLDER],
  features: {
    defaultConnected: false,
    reconnect: false,
  },
});

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [...appConnectors, demoHolderConnector],
  transports: {
    [sepolia.id]: http(rpc),
  },
  ssr: true,
});
