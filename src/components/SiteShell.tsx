"use client";

import { SiteNav } from "@/components/SiteNav";

type SiteShellProps = {
  children: React.ReactNode;
  /** Extra top padding under fixed nav (default on). */
  padNav?: boolean;
};

export function SiteShell({ children, padNav = true }: SiteShellProps) {
  return (
    <>
      <SiteNav />
      <div
        className={
          padNav
            ? "min-h-[100dvh] bg-[var(--surface)] pt-[calc(3.5rem+3px)] text-[var(--ink)] sm:pt-[calc(4rem+3px)] md:pt-[calc(5rem+3px)]"
            : "min-h-[100dvh] bg-[var(--surface)] text-[var(--ink)]"
        }
      >
        {children}
        <footer className="border-t border-[var(--ink)]/20 px-5 py-6 text-center text-[11px] text-[var(--ink)]/50 md:px-8">
          Sepolia only · SQUEEK{" "}
          <span className="text-[var(--ink)]/70">0xcb98…b70f</span> · staking
          proxy <span className="text-[var(--ink)]/70">0x4b67…ea4f</span>
        </footer>
      </div>
    </>
  );
}
