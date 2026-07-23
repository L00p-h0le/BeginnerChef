import { useEffect, useRef } from "react";
import { BrowserProvider } from "ethers";
import { POOLS } from "../utils/contracts";
import { PoolCard } from "./PoolCard";

/** Scroll-entry observer hook */
function useScrollReveal() {
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    refs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  };
}

export function Dashboard({
  provider,
  account,
  connectWallet,
  totalAllocPoint,
  rewardRate,
  globalTVL,
  totalUserStaked,
  totalUserClaimable,
}: {
  provider: BrowserProvider | null;
  account: string;
  connectWallet: () => void;
  totalAllocPoint: number;
  rewardRate: string;
  globalTVL: string;
  totalUserStaked: string;
  totalUserClaimable: string;
}) {
  const setRef = useScrollReveal();

  return (
    <div>
      {/* Header & Stats */}
      <div
        ref={setRef(0)}
        className="scroll-entry mb-10 flex flex-col gap-6"
      >
        <div className="tight-header-glass">
          <h1 className="scanline-title text-5xl md:text-6xl mb-3 whitespace-nowrap">
            Active Pools
          </h1>
          <p
            className="text-lg font-bold"
            style={{ color: "#000000" }}
          >
            Deposit LP tokens to earn RWD rewards in real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div
            className="stat-card px-6 py-5 border border-[#EAEAEA] rounded-lg min-w-[180px]"
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Reward Rate
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {rewardRate}{" "}
              <span
                className="text-sm font-normal"
                style={{
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                RWD/sec
              </span>
            </p>
          </div>
          <div
            className="stat-card px-6 py-5 border border-[#EAEAEA] rounded-lg min-w-[140px]"
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Global TVL
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {Number(globalTVL).toFixed(2)}
            </p>
          </div>
          {account && (
            <>
              <div
                className="stat-card px-6 py-5 border border-[#EAEAEA] rounded-lg min-w-[140px]"
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{
                    color: "var(--color-text-muted)",
                    letterSpacing: "0.05em",
                  }}
                >
                  My Staked
                </p>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {Number(totalUserStaked).toFixed(2)}
                </p>
              </div>
              <div
                className="stat-card px-6 py-5 border border-[#EAEAEA] rounded-lg min-w-[140px]"
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{
                    color: "var(--color-text-muted)",
                    letterSpacing: "0.05em",
                  }}
                >
                  My Claimable
                </p>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent-green-text)" }}
                >
                  {Number(totalUserClaimable).toFixed(2)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pools Grid */}
      <section ref={setRef(1)} className="scroll-entry stagger-1">
        {!account ? (
          <div
            className="text-center py-20"
            style={{
              borderRadius: "12px",
              border: "1px dashed var(--color-surface-border)",
              background: "var(--color-surface)",
            }}
          >
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "1.125rem" }}
            >
              Connect your wallet to view and interact with pools.
            </p>
            <button
              onClick={connectWallet}
              className="neo-btn px-7 py-3 text-sm font-semibold mt-6"
              style={{ borderRadius: "6px" }}
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {POOLS.map((pool) => (
              <PoolCard
                key={pool.pid}
                provider={provider}
                pid={pool.pid}
                address={pool.address}
                symbol={pool.symbol}
                totalAllocPoint={totalAllocPoint}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
