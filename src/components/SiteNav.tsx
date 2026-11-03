"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDisconnect } from "wagmi";
import { HeaderSqkClaim } from "@/components/HeaderSqkClaim";
import {
  navBoxClass,
  navBuyClass,
  navGapClass,
  navLinkClass,
  pageGutterClass,
} from "@/components/navChrome";

function navItemClass(active: boolean) {
  return active
    ? `${navLinkClass} border-[var(--ink)]`
    : navLinkClass;
}

const TWITTER_URL = "https://x.com/SQKSTR";
const BUY_URL =
  "https://testnets.opensea.io/assets/sepolia/0xcb98349c134ab983da5bfd80527dfe2552bdb70f";

type SiteNavProps = {
  barClassName?: string;
};

export function SiteNav({ barClassName = "bg-[var(--surface)]" }: SiteNavProps) {
  const { disconnect } = useDisconnect();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={`fixed inset-x-0 top-0 z-50 ${barClassName}`}>
      <header
        className={`relative z-20 flex h-14 items-center justify-between gap-3 sm:h-16 md:h-20 ${pageGutterClass}`}
      >
        <Link
          href="/"
          className="font-sah1 flex shrink-0 items-center text-[calc(0.5*5rem)] leading-none text-[var(--ink)] sm:text-[calc(0.55*5rem)] md:text-[calc(0.6*6rem)]"
          aria-label="SQUEEKSTR home"
          onClick={closeMenu}
        >
          SQUEEKSTR
        </Link>

        {/* Desktop nav */}
        <nav className={`${navGapClass} hidden md:flex`}>
          <HeaderSqkClaim />
          <a href={BUY_URL} target="_blank" rel="noreferrer" className={navBuyClass}>
            Buy Now
          </a>
          <Link href="/mechanism" className={navItemClass(pathname === "/mechanism")}>
            Mechanism
          </Link>
          <Link href="/level-up" className={navItemClass(pathname === "/level-up")}>
            Level Up
          </Link>
          <Link href="/portfolio" className={navItemClass(pathname === "/portfolio")}>
            Portfolio
          </Link>
          <Link href="/stats" className={navItemClass(pathname === "/stats")}>
            Stats
          </Link>
          <a href={TWITTER_URL} target="_blank" rel="noreferrer" className={navLinkClass}>
            Twitter
          </a>
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
              const ready = mounted;
              const connected = Boolean(ready && account && chain);
              return (
                <>
                  <button
                    type="button"
                    disabled={!ready}
                    onClick={() => {
                      if (connected) openAccountModal?.();
                      else openConnectModal?.();
                    }}
                    className={navBoxClass}
                  >
                    {connected ? `${account?.displayName ?? "Connected"}` : "Connect"}
                  </button>
                  {connected ? (
                    <button
                      type="button"
                      onClick={() => disconnect()}
                      aria-label="Disconnect"
                      title="Disconnect"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center transition opacity-80 hover:opacity-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/exit.png"
                        alt=""
                        className="h-5 w-5 object-contain"
                        draggable={false}
                      />
                    </button>
                  ) : null}
                </>
              );
            }}
          </ConnectButton.Custom>
        </nav>

        {/* Mobile: hamburger only — all actions live in the drawer */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="neu-btn font-offbit inline-flex h-10 shrink-0 items-center gap-2 px-3 text-[13px] leading-none tracking-[0.04em] text-[var(--ink)] md:hidden"
        >
          <span className="inline-flex w-4 flex-col gap-[3px]" aria-hidden>
            <span
              className={`block h-[2px] w-full bg-[var(--ink)] transition ${menuOpen ? "translate-y-[5px] rotate-45" : ""}`}
            />
            <span
              className={`block h-[2px] w-full bg-[var(--ink)] transition ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-[2px] w-full bg-[var(--ink)] transition ${menuOpen ? "-translate-y-[5px] -rotate-45" : ""}`}
            />
          </span>
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>
      <div className="h-[3px] w-full bg-[var(--ink)]" aria-hidden />

      {menuOpen ? (
        <div className="absolute inset-x-0 top-full z-30 md:hidden">
          <div
            className="fixed inset-0 top-[calc(3.5rem+3px)] bg-black/30 sm:top-[calc(4rem+3px)]"
            aria-hidden
            onClick={closeMenu}
          />
          <nav
            className={`relative flex max-h-[min(70dvh,calc(100dvh-3.5rem-3px))] flex-col gap-2.5 overflow-y-auto border-b-[3px] border-[var(--ink)] py-4 ${pageGutterClass} ${barClassName}`}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <HeaderSqkClaim />
            </div>
            <a
              href={BUY_URL}
              target="_blank"
              rel="noreferrer"
              className={`${navBuyClass} w-full`}
              onClick={closeMenu}
            >
              Buy Now
            </a>
            <Link
              href="/mechanism"
              className={`${navItemClass(pathname === "/mechanism")} h-10 w-full justify-start border border-[var(--ink)]`}
              onClick={closeMenu}
            >
              Mechanism
            </Link>
            <Link
              href="/level-up"
              className={`${navItemClass(pathname === "/level-up")} h-10 w-full justify-start border border-[var(--ink)]`}
              onClick={closeMenu}
            >
              Level Up
            </Link>
            <Link
              href="/portfolio"
              className={`${navItemClass(pathname === "/portfolio")} h-10 w-full justify-start border border-[var(--ink)]`}
              onClick={closeMenu}
            >
              Portfolio
            </Link>
            <Link
              href="/stats"
              className={`${navItemClass(pathname === "/stats")} h-10 w-full justify-start border border-[var(--ink)]`}
              onClick={closeMenu}
            >
              Stats
            </Link>
            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noreferrer"
              className={`${navLinkClass} h-10 w-full justify-start border border-[var(--ink)]`}
              onClick={closeMenu}
            >
              Twitter
            </a>
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
                const ready = mounted;
                const connected = Boolean(ready && account && chain);
                return (
                  <>
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => {
                        if (connected) openAccountModal?.();
                        else openConnectModal?.();
                        closeMenu();
                      }}
                      className={`${navBoxClass} w-full`}
                    >
                      {connected
                        ? `${account?.displayName ?? "Connected"}`
                        : "Connect"}
                    </button>
                    {connected ? (
                      <button
                        type="button"
                        onClick={() => {
                          disconnect();
                          closeMenu();
                        }}
                        className={`${navBoxClass} w-full gap-2`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/images/exit.png"
                          alt=""
                          className="h-4 w-4 object-contain"
                          draggable={false}
                        />
                        Disconnect
                      </button>
                    ) : null}
                  </>
                );
              }}
            </ConnectButton.Custom>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
