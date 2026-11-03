"use client";

import { SectionHeading } from "@/components/SectionHeading";
import { VaultLiveStatus } from "@/components/VaultLiveStatus";
import { neuCardClass, neuPanelClass, pageGutterClass } from "@/components/navChrome";
import { useProtocolStats } from "@/hooks/useProtocolStats";
import { VAULT } from "@/lib/contracts";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatSqk(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function StatsSection() {
  const stats = useProtocolStats();

  return (
    <section id="stats" className="relative z-10 min-h-[100dvh]">
      <SectionHeading
        title="STATS"
        subtitle="Protocol vault activity and power."
        action={
          <button
            type="button"
            onClick={() => void stats.refetch()}
            className="font-offbit text-[11px] uppercase tracking-wider text-[var(--ink)] underline-offset-2 hover:underline"
          >
            Refresh
          </button>
        }
      />

      <div
        className={`relative min-h-[calc(100dvh-12rem)] space-y-14 pt-8 pb-20 md:pt-10 md:pb-28 ${pageGutterClass}`}
      >
        <VaultLiveStatus />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className={neuPanelClass}>
            <p className="font-offbit text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]/45">
              Total vault power
            </p>
            <p className="mt-2 font-offbit text-2xl text-[var(--ink)]">
              {stats.powerLoading ? "…" : (stats.power?.totalPower ?? "—")}
            </p>
            <p className="mt-2 text-[12px] tracking-[0.04em] text-[var(--ink)]/55">
              User {stats.power?.userPower ?? "—"} · Protocol{" "}
              {stats.power?.protocolPower ?? "—"}
            </p>
          </div>

          <div className={neuPanelClass}>
            <p className="font-offbit text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]/45">
              Claimable SQK (staking)
            </p>
            <p className="mt-2 font-offbit text-2xl text-[var(--ink)]">
              {stats.claimableLoading
                ? "…"
                : formatSqk(stats.claimable?.claimableSqk ?? "0")}
            </p>
            <p className="mt-2 text-[12px] tracking-[0.04em] text-[var(--ink)]/55">
              Lifetime claimed{" "}
              {formatSqk(stats.claimable?.lifetimePaidSqk ?? "0")} · vault{" "}
              {shortAddr(VAULT)}
            </p>
          </div>

          <div className={neuPanelClass}>
            <p className="font-offbit text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]/45">
              NFTs in vault staking
            </p>
            <p className="mt-2 font-offbit text-2xl text-[var(--ink)]">
              {stats.tipsLoading ? "…" : stats.tips.length}
            </p>
            <p className="mt-2 text-[12px] tracking-[0.04em] text-[var(--ink)]/55">
              API nftPower {stats.claimable?.apiNftPower ?? "—"}
            </p>
          </div>
        </div>

        {(stats.powerError || stats.claimableError || stats.tipsError) && (
          <div className="border border-red-700/40 bg-red-700/10 px-4 py-3 text-sm text-red-800">
            {(stats.powerError as Error | null)?.message ||
              (stats.claimableError as Error | null)?.message ||
              (stats.tipsError as Error | null)?.message}
          </div>
        )}

        <div>
          <h3 className="font-offbit mb-3 text-xs uppercase tracking-[0.2em] text-[var(--ink)]/55">
            All NFTs staked by vault
          </h3>
          {stats.tipsLoading ? (
            <p className="text-sm tracking-[0.06em] text-[var(--ink)]/50">
              Loading…
            </p>
          ) : stats.tips.length === 0 ? (
            <p className="text-sm tracking-[0.06em] text-[var(--ink)]/50">
              No tips in vault staking.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {stats.tips.map((t) => {
                const ready = (t.mergeState ?? "").toLowerCase() === "ready";
                const cooling =
                  (t.mergeState ?? "").toLowerCase() === "cooldown";
                return (
                  <li
                    key={t.tokenId}
                    className={neuCardClass}
                  >
                    <div className="relative aspect-square bg-[var(--ink)]/[0.04]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.image || "/images/placeholder-squeek.png"}
                        alt={`Tip #${t.tokenId}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-0.5 border-t border-[var(--ink)]/15 px-2.5 py-2">
                      <p className="font-offbit text-xs text-[var(--ink)]">
                        #{t.tokenId}
                      </p>
                      <p className="text-[11px] text-[var(--ink)]/60">
                        L{t.level} · power {t.power || "-"}
                      </p>
                      <p
                        className={`font-offbit text-[11px] uppercase tracking-[0.06em] ${
                          ready
                            ? "text-green-600"
                            : cooling
                              ? "text-red-600"
                              : "text-[var(--ink)]/50"
                        }`}
                      >
                        {ready
                          ? "Merge ready"
                          : cooling
                            ? t.nextMergeHeight && t.nextMergeHeight !== "0"
                              ? `Cooldown · blk ${t.nextMergeHeight}`
                              : "Cooldown"
                            : t.mergeState || "—"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
