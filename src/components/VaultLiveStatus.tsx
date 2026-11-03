"use client";

import { VAULT } from "@/lib/contracts";
import { useVaultLiveStatus } from "@/hooks/useVaultLiveStatus";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(d: Date | null): string {
  if (!d) return "—";
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function VaultLiveStatus() {
  const {
    tips,
    activity,
    byLevel,
    isLoading,
    isFetching,
    error,
    refetch,
    blockNumber,
    lastUpdated,
  } = useVaultLiveStatus();

  const levelSummary = [...byLevel.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([lvl, n]) => `L${lvl}×${n}`)
    .join(" · ");

  return (
    <div className="neu-panel mb-12 !p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ink)]/15 px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
          </span>
          <div>
            <p className="font-offbit text-xs uppercase tracking-[0.18em] text-[var(--ink)]">
              Vault live status
            </p>
            <p className="text-[12px] tracking-[0.04em] text-[var(--ink)]/55">
              Tracking deposits into {shortAddr(VAULT)}
              {blockNumber != null ? ` · block ${blockNumber.toString()}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] tracking-[0.04em] text-[var(--ink)]/45">
            {isFetching ? "syncing…" : `updated ${timeAgo(lastUpdated)}`}
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="font-offbit text-[11px] uppercase tracking-wider text-[var(--ink)] underline-offset-2 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 px-4 pb-5 pt-4 sm:grid-cols-[1fr_1.2fr] sm:px-5 sm:pb-6 sm:pt-5">
        <div>
          <p className="font-offbit text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]/45">
            Tips in vault now
          </p>
          {isLoading ? (
            <p className="mt-2 text-sm text-[var(--ink)]/50">Loading…</p>
          ) : (
            <>
              <p className="mt-1 font-offbit text-2xl text-[var(--ink)]">
                {tips.length}
              </p>
              <p className="mt-1 text-[12px] tracking-[0.04em] text-[var(--ink)]/55">
                {levelSummary || "empty"}
              </p>
              {tips.length > 0 && (
                <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-[12px] tracking-[0.03em] text-[var(--ink)]/70">
                  {tips.map((t) => (
                    <li key={t.tokenId} className="flex justify-between gap-2">
                      <span>
                        #{t.tokenId} · L{t.level}
                        {t.virginDeposit ? " · virgin" : ""} · p{" "}
                        {t.powerDisplay}
                      </span>
                      <span className="shrink-0 text-[var(--ink)]/40">
                        {shortAddr(t.depositor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div>
          <p className="font-offbit text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]/45">
            Activity feed
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-700">
              {(error as Error).message}
            </p>
          )}
          {!isLoading && activity.length === 0 && (
            <p className="mt-2 text-sm text-[var(--ink)]/50">No events yet.</p>
          )}
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {activity.slice(0, 20).map((a) => (
              <li
                key={`${a.kind}-${a.txHash}-${a.blockNumber}`}
                className="rounded-[14px] bg-[var(--neu-box)] px-3.5 py-3 text-[12px] leading-relaxed tracking-[0.03em] shadow-[var(--neu-inset-sm)]"
              >
                {a.kind === "deposit" ? (
                  <p>
                    <span className="font-offbit text-[var(--orange)]">
                      DEPOSIT
                    </span>{" "}
                    #{a.tokenId} → tracker #{a.trackerId} · L{a.level} ·{" "}
                    {shortAddr(a.depositor)}
                  </p>
                ) : (
                  <p>
                    <span className="font-offbit text-[var(--blue)]">MERGE</span>{" "}
                    #{a.tipA} + #{a.tipB} → #{a.newTip} · L{a.newLevel}
                  </p>
                )}
                <a
                  href={`https://sepolia.etherscan.io/tx/${a.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-block text-[11px] text-[var(--ink)]/45 underline-offset-2 hover:underline"
                >
                  block {a.blockNumber.toString()} · tx
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
