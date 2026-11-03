import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optional Coinbase CDP / x402 deps pulled transitively by RainbowKit + wagmi
  serverExternalPackages: ["@coinbase/cdp-sdk", "@base-org/account"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@x402/core/client": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm/exact/client": false,
      "@react-native-async-storage/async-storage": false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
