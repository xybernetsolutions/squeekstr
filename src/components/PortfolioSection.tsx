"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SectionHeading } from "@/components/SectionHeading";
import { neuCardClass, pageGutterClass } from "@/components/navChrome";
import { useDepositSqueek } from "@/hooks/useDepositSqueek";
import { useHeldSqueeks } from "@/hooks/useHeldSqueeks";
import { useHeldTrackers } from "@/hooks/useHeldTrackers";
import { useSqkRewards } from "@/hooks/useSqkRewards";
import { useAccount } from "wagmi";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function PortfolioSection() {
  const { isConnected } = useAccount();
  const squeeks = useHeldSqueeks();
  const trackersQ = useHeldTrackers();
  const rewards = useSqkRewards();

  const refreshAll = async () => {
    await Promise.all([
      squeeks.refetch(),
      trackersQ.refetch(),
      rewards.refetch(),
    ]);
  };

  const {
    deposit,
    pendingId,
    busy: depositBusy,
    error: depositError,
    phase: depositPhase,
  } = useDepositSqueek(() => {
    void refreshAll();
  });

  const emptyConnected =
    isConnected &&
    !squeeks.isLoading &&
    !squeeks.error &&
    squeeks.tokens.length === 0 &&
    trackersQ.trackers.length === 0;

  return (
    <section id="portfolio" className="relative z-10 min-h-[100dvh]">
      <SectionHeading
        title="PORTFOLIO"
        subtitle="Your SQUEEKs on Sepolia."
        action={
          isConnected ? (
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="font-offbit text-[11px] uppercase tracking-wider text-[var(--ink)] underline-offset-2 hover:underline"
            >
              Refresh
            </button>
          ) : null
        }
      />

      <div
        className={`relative min-h-[calc(100dvh-12rem)] space-y-14 pt-8 pb-20 md:pt-10 md:pb-28 ${pageGutterClass}`}
      >
        {!isConnected && (
          <div className="flex justify-center border border-dashed border-[var(--ink)]/30 bg-[var(--ink)]/[0.03] px-5 py-10">
            <ConnectButton.Custom>
              {({ openConnectModal, mounted }) => (
                <button
                  type="button"
                  disabled={!mounted}
                  onClick={() => openConnectModal?.()}
                  className="neu-btn font-offbit px-5 py-3 text-[14px] uppercase tracking-[0.08em] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white disabled:opacity-50"
                >
                  Connect wallet
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        )}

        {isConnected && (squeeks.isLoading || trackersQ.isLoading) && (
          <p className="font-offbit text-sm uppercase tracking-wider text-[var(--ink)]/60">
            Loading holdings…
          </p>
        )}

        {isConnected && squeeks.error && (
          <div className="border border-red-700/40 bg-red-700/10 px-4 py-3 text-sm text-red-800">
            {(squeeks.error as Error).message}
          </div>
        )}

        {(depositError || rewards.claimError) && (
          <div className="border border-red-700/40 bg-red-700/10 px-4 py-3 text-sm text-red-800">
            {depositError || rewards.claimError}
          </div>
        )}

        {isConnected && (
          <div className="neu-panel relative px-5 py-5 sm:px-6 sm:py-6">
            <button
              type="button"
              disabled={
                rewards.claiming ||
                rewards.claimableTotalRaw === BigInt(0) ||
                rewards.isLoading
              }
              onClick={() => void rewards.claimAll()}
              className="neu-btn-ink font-offbit absolute top-5 right-5 px-4 py-2.5 text-[12px] uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-40 sm:top-6 sm:right-6"
            >
              {rewards.claiming ? "Claiming…" : "Claim SQK"}
            </button>
            <div className="pr-[7.75rem] sm:pr-[8.5rem]">
              <h3 className="font-offbit text-xs uppercase tracking-[0.2em] text-[var(--ink)]/55">
                SQK rewards
              </h3>
              <p className="mt-2 font-offbit text-2xl text-[var(--ink)]">
                {rewards.isLoading
                  ? "…"
                  : Number(rewards.claimableTotal).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}{" "}
                <span className="text-[14px] text-[var(--ink)]/50">
                  claimable
                </span>
              </p>
              <p className="mt-1 text-[12px] tracking-[0.04em] text-[var(--ink)]/55">
                Epoch {rewards.currentEpoch}
                {rewards.currentEpoch === "0"
                  ? " · no epoch finalized yet"
                  : ""}
                . Accruing on {rewards.trackers.length} tracker
                {rewards.trackers.length === 1 ? "" : "s"}.
              </p>
            </div>
            {rewards.trackers.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-[var(--ink)]/10 pt-3 text-[12px] tracking-[0.03em] text-[var(--ink)]/70">
                {rewards.trackers.map((t) => (
                  <li
                    key={t.trackerId}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <span>Tracker #{t.trackerId}</span>
                    <span>
                      open score{" "}
                      {Number(t.liveScore).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                      {" · claimable "}
                      {Number(t.claimable).toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      SQK
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {emptyConnected && (
          <div className="border border-[var(--orange)]/50 bg-[var(--orange)]/10 px-5 py-8">
            <p className="font-offbit text-sm uppercase tracking-wider text-[var(--orange)]">
              No wallet SQUEEKs
            </p>
            <p className="mt-2 max-w-lg text-sm tracking-[0.06em] text-[var(--ink)]/80">
              Connected as{" "}
              {squeeks.address ? shortAddr(squeeks.address) : "-"}.
              {squeeks.balance != null && (
                <>
                  {" "}
                  On-chain <code className="text-[var(--ink)]">balanceOf</code> ={" "}
                  {squeeks.balance}.
                </>
              )}
            </p>
          </div>
        )}

        {isConnected && squeeks.tokens.length > 0 && (
          <div>
            <h3 className="font-offbit mb-3 text-xs uppercase tracking-[0.2em] text-[var(--ink)]/55">
              Held SQUEEKs ({squeeks.tokens.length}
              {squeeks.balance != null ? ` · chain ${squeeks.balance}` : ""})
            </h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {squeeks.tokens.map((t) => {
                const active = pendingId === t.tokenId;
                const label = !active
                  ? "Send to Protocol"
                  : depositPhase === "approving"
                    ? "Approving…"
                    : depositPhase === "depositing"
                      ? "Depositing…"
                      : depositPhase === "confirming"
                        ? "Confirming…"
                        : "Send to Protocol";

                return (
                  <li
                    key={t.tokenId}
                    className={neuCardClass}
                  >
                    <div className="relative aspect-square bg-[var(--ink)]/[0.04]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.image || "/images/placeholder-squeek.png"}
                        alt={`SQUEEK #${t.tokenId}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-0.5 border-t border-[var(--ink)]/15 px-2.5 py-2">
                      <p className="font-offbit text-xs text-[var(--ink)]">
                        #{t.tokenId}
                      </p>
                      <p className="text-[11px] text-[var(--ink)]/60">
                        L{t.level ?? "?"} · power {t.power ?? "-"}
                      </p>
                    </div>
                    <div className="border-t border-[var(--ink)]/15 p-2">
                      <button
                        type="button"
                        disabled={depositBusy}
                        onClick={() => void deposit(t.tokenId)}
                        className="neu-btn font-offbit w-full px-2 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {label}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {isConnected && (
          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h3 className="font-offbit text-xs uppercase tracking-[0.2em] text-[var(--ink)]/55">
                Trackers ({trackersQ.trackers.length})
              </h3>
              <p className="max-w-md text-[12px] tracking-[0.04em] text-[var(--ink)]/55">
                Merge backing parents on Level Up.
              </p>
            </div>

            {trackersQ.trackers.length === 0 ? (
              <p className="text-sm tracking-[0.06em] text-[var(--ink)]/50">
                No tracker receipts yet. Send a SQUEEK to the protocol to mint
                one.
              </p>
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {trackersQ.trackers.map((t) => (
                    <li
                      key={t.trackerId}
                      className={neuCardClass}
                    >
                      <div className="relative aspect-square bg-[var(--ink)]/[0.04]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={t.image}
                          alt={`Tracker #${t.trackerId}`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5 border-t border-[var(--ink)]/15 px-2.5 py-2">
                        <p className="font-offbit text-xs text-[var(--ink)]">
                          Tracker #{t.trackerId}
                        </p>
                        <p className="text-[11px] text-[var(--ink)]/60">
                          tip #{t.tipTokenId} · L{t.tipLevel} · power{" "}
                          {t.powerDisplay}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href="/level-up"
                    className="neu-btn font-offbit px-4 py-2.5 text-[12px] uppercase tracking-[0.08em] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white"
                  >
                    Merge backing parents
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
