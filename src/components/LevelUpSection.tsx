"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SectionHeading } from "@/components/SectionHeading";
import { useHeldTrackers } from "@/hooks/useHeldTrackers";
import { useMergeTips } from "@/hooks/useMergeTips";
import { useVaultHoldings, type VaultTip } from "@/hooks/useVaultHoldings";
import { neuCardClass, pageGutterClass } from "@/components/navChrome";
import { VAULT, vaultAbi } from "@/lib/contracts";
import { useAccount, usePublicClient } from "wagmi";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function LevelUpSection() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const trackersQ = useHeldTrackers();
  const vaultQ = useVaultHoldings();

  const myTipIds = useMemo(
    () => new Set(trackersQ.trackers.map((t) => t.tipTokenId)),
    [trackersQ.trackers],
  );

  const [mergingTip, setMergingTip] = useState<{
    tipTokenId: string;
    tipLevel: number;
  } | null>(null);
  const [pickedOther, setPickedOther] = useState<string | null>(null);
  const [mergeable, setMergeable] = useState<Record<string, boolean>>({});

  const refreshAll = async () => {
    await Promise.all([trackersQ.refetch(), vaultQ.refetch()]);
  };

  const { merge, busy, error, phase, reset } = useMergeTips(() => {
    setMergingTip(null);
    setPickedOther(null);
    void refreshAll();
  });

  /** Tip id → vault merge status (same source as Stats / vault cards). */
  const tipStatusById = useMemo(() => {
    const map = new Map<string, VaultTip>();
    for (const tip of vaultQ.tips) map.set(tip.tokenId, tip);
    return map;
  }, [vaultQ.tips]);

  /** Same-level vault tips only — merge status (ready / cooldown) shown under each card. */
  const othersAtLevel: VaultTip[] = useMemo(() => {
    if (!mergingTip) return [];
    return vaultQ.tips.filter(
      (t) =>
        t.level === mergingTip.tipLevel &&
        t.tokenId !== mergingTip.tipTokenId,
    );
  }, [mergingTip, vaultQ.tips]);

  useEffect(() => {
    if (!mergingTip || othersAtLevel.length === 0 || !publicClient) {
      setMergeable({});
      return;
    }

    let cancelled = false;
    void (async () => {
      const next: Record<string, boolean> = {};
      await Promise.all(
        othersAtLevel.map(async (o) => {
          try {
            next[o.tokenId] = Boolean(
              await publicClient.readContract({
                address: VAULT,
                abi: vaultAbi,
                functionName: "canMergeTips",
                args: [BigInt(mergingTip.tipTokenId), BigInt(o.tokenId)],
              }),
            );
          } catch {
            next[o.tokenId] = false;
          }
        }),
      );
      if (!cancelled) setMergeable(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [mergingTip, othersAtLevel, publicClient]);

  function mergeStatusLabel(o: Pick<VaultTip, "mergeState" | "nextMergeHeight">): string {
    const state = (o.mergeState ?? "").toLowerCase();
    if (state === "ready") return "Merge ready";
    if (state === "cooldown") {
      const h = o.nextMergeHeight && o.nextMergeHeight !== "0" ? o.nextMergeHeight : null;
      return h ? `Cooldown · blk ${h}` : "Cooldown";
    }
    if (state === "terminal") return "Terminal";
    if (state === "merges_closed") return "Merges closed";
    return o.mergeState || "—";
  }

  function mergeStatusClass(mergeState: string | null | undefined): string {
    const state = (mergeState ?? "").toLowerCase();
    if (state === "ready") return "text-green-600";
    if (state === "cooldown") return "text-red-600";
    return "text-[var(--ink)]/50";
  }

  const openMerge = (tipTokenId: string, tipLevel: number) => {
    reset();
    setPickedOther(null);
    setMergingTip({ tipTokenId, tipLevel });
  };

  const closeMerge = () => {
    setMergingTip(null);
    setPickedOther(null);
    reset();
  };

  return (
    <section id="level-up" className="relative z-10 min-h-[100dvh]">
      <SectionHeading
        title="LEVEL UP"
        subtitle="Vaults, deposits, and same-level merges."
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
        className={`relative min-h-[calc(100dvh-12rem)] pt-8 pb-20 md:pt-10 md:pb-28 ${pageGutterClass}`}
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

        {isConnected && (trackersQ.isLoading || vaultQ.isLoading) && (
          <p className="font-offbit text-sm uppercase tracking-wider text-[var(--ink)]/60">
            Loading parents…
          </p>
        )}

        {(trackersQ.error || vaultQ.error || error) && (
          <div className="mb-4 border border-red-700/40 bg-red-700/10 px-4 py-3 text-sm text-red-800">
            {(error ||
              (trackersQ.error as Error | null)?.message ||
              (vaultQ.error as Error | null)?.message) ??
              "Error"}
          </div>
        )}

        {isConnected && !trackersQ.isLoading && (
          <div>
            <h3 className="font-offbit mb-2 text-xs uppercase tracking-[0.2em] text-[var(--ink)]/55">
              Parents backing your Trackers
            </h3>
            <p className="mb-4 max-w-2xl text-[13px] tracking-[0.04em] text-[var(--ink)]/55">
              Merge with Other lists same-level tips in vault staking and shows
              merge ready / cooldown under each. Your tip is kept and levels
              up; the other is burned.
            </p>

            {trackersQ.trackers.length === 0 ? (
              <p className="text-sm tracking-[0.06em] text-[var(--ink)]/50">
                No trackers yet. Send a SQUEEK to the protocol from Portfolio.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {trackersQ.trackers.map((t) => {
                  const tipStatus = tipStatusById.get(t.tipTokenId);
                  return (
                    <li
                      key={t.trackerId}
                      className={neuCardClass}
                    >
                      <div className="relative aspect-square bg-[var(--ink)]/[0.04]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            t.tipImage || "/images/placeholder-squeek.png"
                          }
                          alt={`Parent tip #${t.tipTokenId}`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5 border-t border-[var(--ink)]/10 px-2.5 py-2">
                        <p className="font-offbit text-xs text-[var(--ink)]">
                          Tip #{t.tipTokenId}
                        </p>
                        <p className="text-[11px] text-[var(--ink)]/60">
                          L{t.tipLevel} · power{" "}
                          {t.tipPower ?? t.powerDisplay} · tracker #
                          {t.trackerId}
                        </p>
                        <p
                          className={`font-offbit text-[11px] uppercase tracking-[0.06em] ${mergeStatusClass(tipStatus?.mergeState)}`}
                        >
                          {tipStatus
                            ? mergeStatusLabel(tipStatus)
                            : vaultQ.isLoading
                              ? "…"
                              : "—"}
                        </p>
                      </div>
                      <div className="border-t border-[var(--ink)]/10 p-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openMerge(t.tipTokenId, t.tipLevel)}
                          className="neu-btn font-offbit w-full px-2 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white disabled:opacity-50"
                        >
                          Merge with Other
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {mergingTip && (
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Merge with other tip"
          >
            <div className="neu-raised max-h-[85dvh] w-full max-w-3xl overflow-y-auto p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-offbit text-sm uppercase tracking-[0.14em] text-[var(--ink)]">
                    Merge tip #{mergingTip.tipTokenId}
                  </h4>
                  <p className="mt-1 text-[13px] tracking-[0.04em] text-[var(--ink)]/60">
                    Same-level (L{mergingTip.tipLevel}) tips in vault staking.
                    Status under each card. After merge your tip becomes L
                    {mergingTip.tipLevel + 1}.
                  </p>
                  {address && (
                    <p className="mt-1 text-[11px] tracking-[0.04em] text-[var(--ink)]/45">
                      {othersAtLevel.length} candidate
                      {othersAtLevel.length === 1 ? "" : "s"} · vault{" "}
                      {shortAddr(VAULT)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeMerge}
                  className="font-offbit text-[11px] uppercase tracking-wider text-[var(--ink)]/60 underline-offset-2 hover:underline"
                >
                  Cancel
                </button>
              </div>

              {vaultQ.isLoading ? (
                <p className="text-sm tracking-[0.06em] text-[var(--ink)]/50">
                  Loading vault deposits…
                </p>
              ) : othersAtLevel.length === 0 ? (
                <p className="text-sm tracking-[0.06em] text-[var(--ink)]/50">
                  No other L{mergingTip.tipLevel} tips in vault staking yet.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {othersAtLevel.map((o) => {
                    const on = pickedOther === o.tokenId;
                    const ok = mergeable[o.tokenId] === true;
                    const mine = myTipIds.has(o.tokenId);
                    return (
                      <li key={o.tokenId}>
                        <button
                          type="button"
                          disabled={!ok}
                          onClick={() => {
                            if (ok) setPickedOther(o.tokenId);
                          }}
                          title={
                            !ok
                              ? "Vault cannot merge these tips"
                              : "Select to burn in merge"
                          }
                          className={`neu-card w-full text-left disabled:cursor-not-allowed disabled:opacity-55 ${
                            on ? "ring-2 ring-[var(--ink)]" : ""
                          }`}
                        >
                          <div className="relative aspect-square bg-[var(--ink)]/[0.04]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                o.image || "/images/placeholder-squeek.png"
                              }
                              alt={`Other tip #${o.tokenId}`}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            {on && (
                              <span className="font-offbit absolute left-2 top-2 bg-[var(--ink)] px-1.5 py-0.5 text-[10px] uppercase text-white">
                                Burn
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5 border-t border-[var(--ink)]/15 px-2.5 py-2">
                            <p className="font-offbit text-xs text-[var(--ink)]">
                              #{o.tokenId}
                              {mine ? " · yours" : ""}
                            </p>
                            <p className="text-[11px] text-[var(--ink)]/60">
                              L{o.level} · power {o.power || "-"}
                            </p>
                            <p
                              className={`font-offbit text-[11px] uppercase tracking-[0.06em] ${mergeStatusClass(o.mergeState)}`}
                            >
                              {mergeStatusLabel(o)}
                              {!ok ? " · not mergeable" : ""}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={
                    !pickedOther || busy || mergeable[pickedOther] === false
                  }
                  onClick={() => {
                    if (!pickedOther || !mergingTip) return;
                    void merge(mergingTip.tipTokenId, pickedOther);
                  }}
                  className="neu-btn-ink font-offbit px-4 py-2.5 text-[12px] uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy
                    ? phase === "checking"
                      ? "Checking…"
                      : phase === "merging"
                        ? "Merging…"
                        : "Confirming…"
                    : "Confirm merge"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
