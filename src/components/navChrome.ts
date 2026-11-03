/** Shared horizontal page gutter — logo, titles, and body share one left edge. */
export const pageGutterClass = "px-6 sm:px-9 md:px-[60px]";

/** Shared top-nav control styles. */
export const navLinkClass =
  "font-offbit inline-flex h-10 shrink-0 items-center justify-center border border-transparent px-2.5 text-[13px] leading-none tracking-[0.02em] text-[var(--ink)] transition hover:border-[var(--ink)] md:h-8 md:px-3 md:text-[15px]";

const navControlBase =
  "font-offbit inline-flex h-10 min-w-[5.5rem] shrink-0 items-center justify-center px-2.5 text-[13px] leading-none tracking-[0.02em] disabled:cursor-not-allowed disabled:opacity-40 md:h-8 md:min-w-[6.25rem] md:px-3 md:text-[15px]";

/** Soft raised → ink fill on hover (Claim, Connect). */
export const navBoxClass =
  `${navControlBase} neu-btn text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white hover:border-[var(--ink)] disabled:hover:bg-white disabled:hover:text-[var(--ink)]`;

/** Ink extruded → soft surface on hover (Buy Now). */
export const navBuyClass = `${navControlBase} neu-btn-ink`;

/** Shared tip / NFT card surface */
export const neuCardClass = "neu-card overflow-hidden";

/** Soft inset stat / info panel */
export const neuPanelClass = "neu-panel px-4 py-4 sm:px-5";

export const navGapClass =
  "min-w-0 flex-nowrap items-center justify-end gap-x-2.5";
