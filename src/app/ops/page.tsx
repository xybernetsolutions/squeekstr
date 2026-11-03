import type { Metadata } from "next";
import { OpsDesk } from "@/components/OpsDesk";

export const metadata: Metadata = {
  title: "Vault desk",
  robots: { index: false, follow: false },
};

export default function OpsPage() {
  return <OpsDesk />;
}
