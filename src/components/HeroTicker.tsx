import Link from "next/link";

function TickerCopy() {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap px-10">
      Go to{" "}
      <Link
        href="/portfolio"
        className="mx-1 underline decoration-white/70 underline-offset-2 hover:decoration-white"
      >
        &lt;Portfolio&gt;
      </Link>{" "}
      and deposit the SQUEEK you want to upgrade. Then navigate to{" "}
      <Link
        href="/level-up"
        className="mx-1 underline decoration-white/70 underline-offset-2 hover:decoration-white"
      >
        &lt;Level Up&gt;
      </Link>{" "}
      Merge with Other and select the SQUEEK you want to merge it with.
    </span>
  );
}

const rgbLine =
  "linear-gradient(90deg, #ff003c, #ff7a00, #ffd400, #00e676, #00b0ff, #7c4dff, #ff003c)";

/** Thin RGB-edged marquee under the home header rule. */
export function HeroTicker() {
  return (
    <div
      className="hero-ticker-anchor fixed inset-x-0 top-[calc(3.5rem+3px+2px)] z-40 sm:top-[calc(4rem+3px+2px)] md:top-[calc(5rem+3px+2px)]"
      aria-label="How to level up"
    >
      <div className="h-[2px] w-full" style={{ background: rgbLine }} aria-hidden />
      <div className="h-7 overflow-hidden bg-black md:h-8">
        <div className="hero-ticker-track flex h-full w-max items-center font-offbit text-[11px] leading-none tracking-[0.06em] text-white md:text-[12px]">
          <TickerCopy />
          <TickerCopy />
        </div>
      </div>
      <div className="h-[2px] w-full" style={{ background: rgbLine }} aria-hidden />
    </div>
  );
}

/** Header + black rule + ticker (incl. RGB edges). */
export const heroTickerOffsetClass =
  "pt-[calc(3.5rem+3px+2px+1.75rem+4px)] sm:pt-[calc(4rem+3px+2px+1.75rem+4px)] md:pt-[calc(5rem+3px+2px+2rem+4px)]";
