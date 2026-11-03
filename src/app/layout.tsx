import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQUEEKSTR",
  description: "Permissionless experiments with SQUEEK",
  other: {
    "squeekchain-project": "ee83d7e9-6261-4605-835e-91a01f6af89e",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
