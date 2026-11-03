"use client";

import type { Wallet } from "@rainbow-me/rainbowkit";
import { createConnector } from "wagmi";
import { injected } from "wagmi/connectors";

const META_MASK_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' fill='none' viewBox='0 0 28 28'%3E%3Cpath fill='%23fff' d='M0 0h28v28H0z'/%3E%3Cpath fill='%23ff5c16' d='m24.024 23.824-4.846-1.434-3.655 2.172-2.55-.001-3.656-2.171-4.844 1.434L3 18.88l1.473-5.488L3 8.751 4.473 3l7.569 4.496h4.413L24.024 3l1.473 5.751-1.473 4.64 1.473 5.488z'/%3E%3C/svg%3E";

function isMetaMaskProvider(ethereum: unknown): boolean {
  if (!ethereum || typeof ethereum !== "object") return false;
  const e = ethereum as { isMetaMask?: boolean; providers?: unknown[] };
  if (Array.isArray(e.providers)) {
    return e.providers.some((p) => isMetaMaskProvider(p));
  }
  return Boolean(e.isMetaMask);
}

/**
 * MetaMask via injected EIP-1193 only — not MetaMask SDK / WalletConnect.
 * Avoids Reown allowlist errors on tunnels and local origins.
 */
export function metaMaskExtensionWallet(): Wallet {
  const installed =
    typeof window !== "undefined"
      ? isMetaMaskProvider(
          (window as unknown as { ethereum?: unknown }).ethereum,
        )
      : undefined;

  return {
    id: "metaMaskExtension",
    name: "MetaMask",
    rdns: "io.metamask",
    iconUrl: META_MASK_ICON,
    iconAccent: "#f6851a",
    iconBackground: "#fff",
    installed,
    downloadUrls: {
      chrome:
        "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
      browserExtension: "https://metamask.io/download",
      mobile: "https://metamask.io/download",
    },
    createConnector: (walletDetails) =>
      createConnector((config) => ({
        ...injected({
          target: "metaMask",
          unstable_shimAsyncInject: 2_000,
        })(config),
        ...walletDetails,
      })),
  };
}
