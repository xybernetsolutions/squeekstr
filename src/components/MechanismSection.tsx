import { SectionHeading } from "@/components/SectionHeading";
import { pageGutterClass } from "@/components/navChrome";

export function MechanismSection() {
  return (
    <section id="mechanism" className="relative z-10 min-h-[100dvh]">
      <SectionHeading title="MECHANISM" subtitle="How it All Works." />

      <div
        className={`relative grid items-start gap-10 pb-20 md:grid-cols-2 md:gap-12 md:pb-28 lg:gap-16 ${pageGutterClass}`}
      >
        <div className="space-y-8 font-offbit text-[15px] leading-relaxed tracking-[0.04em] text-[var(--ink)] md:text-[16px] md:leading-[1.7]">
          <div className="space-y-3">
            <h2 className="font-offbit text-[13px] uppercase tracking-[0.18em] text-[var(--ink)] md:text-[14px]">
              Native token
            </h2>
            <p>
              <span className="font-bold">SQKSTR</span> is the backbone of the
              protocol - the native ERC-20 token deployed on Ethereum mainnet.
              It coordinates value capture, NFT acquisition, and reward flow
              across the system.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-offbit text-[13px] uppercase tracking-[0.18em] text-[var(--ink)] md:text-[14px]">
              Tax &amp; acquisition
            </h2>
            <p>
              Every buy and sell of SQKSTR is taxed at{" "}
              <span className="font-bold">5%</span>. Wallet-to-wallet transfers
              are exempt, so moving tokens between your own addresses does not
              trigger the tax.
            </p>
            <p>
              Funds collected from these taxes are used to market-buy SQUEEK
              NFTs on a regular basis. Acquired SQUEEKs are deposited into the
              protocol vault, growing the shared pool that powers mining
              rewards.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-offbit text-[13px] uppercase tracking-[0.18em] text-[var(--ink)] md:text-[14px]">
              Deposits &amp; tracker receipts
            </h2>
            <p>
              Users can deposit their own SQUEEK NFTs into the protocol. When a
              SQUEEK is deposited, a{" "}
              <span className="font-bold">tracker receipt</span> NFT is minted
              to the depositor’s wallet. That receipt is your claim on protocol
              rewards - it records the mining power assigned to your position.
            </p>
            <p>
              The protocol merges SQUEEKs from user deposits and tax-funded
              purchases, increasing total mining power over time. Rewards are
              distributed to depositors in proportion to the power on their
              tracker receipts.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-offbit text-[13px] uppercase tracking-[0.18em] text-[var(--ink)] md:text-[14px]">
              Tradable receipts
            </h2>
            <p>
              Tracker receipts are standard NFTs. You can trade them on open
              markets such as <span className="font-bold">OpenSea</span>,{" "}
              <span className="font-bold">Gondi</span>, and other NFT venues -
              the same way you would any other collectible.
            </p>
            <p>
              Each tracker NFT displays the{" "}
              <span className="font-bold">power</span> assigned to that
              position. SQK mining rewards are distributed according to that
              power: higher power means a larger share of protocol rewards.
              Transferring the receipt transfers the claim.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-offbit text-[13px] uppercase tracking-[0.18em] text-[var(--ink)] md:text-[14px]">
              Protocol cut on merge
            </h2>
            <p>
              When two same-level tips merge and level up, total mining power
              grows by a{" "}
              <span className="font-bold">10%</span> bump. Of that bump,{" "}
              <span className="font-bold">75%</span> stays with depositors
              (community power) and the protocol takes a{" "}
              <span className="font-bold">25% power cut</span>, credited to the
              protocol tracker.
            </p>
          </div>
        </div>

        <div className="flex w-full justify-end md:sticky md:top-[calc(5rem+3px+6rem)] md:justify-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/flow.png"
            alt="How SQUEEKSTR works"
            className="h-auto w-full max-h-[66dvh] max-w-[min(100%,33.6rem)] object-contain object-right select-none"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}
