"use client";

import Link from "next/link";
import { HeroTicker, heroTickerOffsetClass } from "@/components/HeroTicker";
import { SiteNav } from "@/components/SiteNav";
import { navBoxClass, navLinkClass } from "@/components/navChrome";

/** Home: hero only — sections live on their own routes. */
export function HomeExperience() {
  return (
    <>
      <SiteNav />
      <HeroTicker />
      <div
        className={`relative flex min-h-[100dvh] flex-col bg-[var(--surface)] ${heroTickerOffsetClass}`}
      >
        <div className="relative flex flex-1 flex-col items-center justify-end overflow-hidden">
          {/* Mobile: PNG (huge SVG blanks on iOS). Desktop: SVG. */}
          <picture className="pointer-events-none absolute inset-0 block h-full w-full">
            <source
              media="(min-width: 768px)"
              srcSet="/images/frame25.svg"
              type="image/svg+xml"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/final.png"
              alt=""
              className="h-full w-full select-none object-cover object-bottom md:object-contain"
              draggable={false}
            />
          </picture>
          <div className="relative z-10 mb-10 flex flex-wrap items-center justify-center gap-3 px-6 sm:mb-14">
            <Link href="/mechanism" className={navBoxClass}>
              Mechanism
            </Link>
            <Link href="/portfolio" className={navLinkClass}>
              Portfolio
            </Link>
            <Link href="/level-up" className={navLinkClass}>
              Level Up
            </Link>
            <Link href="/stats" className={navLinkClass}>
              Stats
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
