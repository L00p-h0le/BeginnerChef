import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, formatUnits } from "ethers";
import { getChefContract, POOLS } from "../utils/contracts";

interface HistoryPageProps {
  provider: BrowserProvider | null;
}

interface TxEvent {
  type: "Deposit" | "Withdraw";
  user: string;
  pid: number;
  amount: string;
  blockNumber: number;
  txHash: string;
  timestamp?: number;
}

const EVENT_STYLES: Record<string, { icon: string; bg: string; color: string }> = {
  Deposit: {
    icon: "\u2193",
    bg: "var(--color-accent-green)",
    color: "var(--color-accent-green-text)",
  },
  Withdraw: {
    icon: "\u2191",
    bg: "var(--color-accent-yellow)",
    color: "var(--color-accent-yellow-text)",
  },
};

function getPoolSymbol(pid: number): string {
  const pool = POOLS.find((p) => p.pid === pid);
  return pool ? pool.symbol : `PID-${pid}`;
}

function shortenHash(hash: string): string {
  return `${hash.substring(0, 6)}\u2026${hash.substring(hash.length - 4)}`;
}

export function HistoryPage({ provider }: HistoryPageProps) {
  const [events, setEvents] = useState<TxEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    setError("");

    try {
      const chef = await getChefContract(provider);
      const signer = await provider.getSigner();
      const userAddr = await signer.getAddress();

      // Query Deposit and Withdraw events for this user
      const depositFilter = chef.filters.Deposit(userAddr);
      const withdrawFilter = chef.filters.Withdraw(userAddr);

      const [deposits, withdrawals] = await Promise.all([
        chef.queryFilter(depositFilter, -10000),
        chef.queryFilter(withdrawFilter, -10000),
      ]);

      const allEvents: TxEvent[] = [];

      for (const ev of deposits) {
        const args = (ev as any).args;
        if (!args) continue;
        allEvents.push({
          type: "Deposit",
          user: args.user,
          pid: Number(args.pid),
          amount: formatUnits(args.amount, 18),
          blockNumber: ev.blockNumber,
          txHash: ev.transactionHash,
        });
      }

      for (const ev of withdrawals) {
        const args = (ev as any).args;
        if (!args) continue;
        allEvents.push({
          type: "Withdraw",
          user: args.user,
          pid: Number(args.pid),
          amount: formatUnits(args.amount, 18),
          blockNumber: ev.blockNumber,
          txHash: ev.transactionHash,
        });
      }

      // Sort descending by block number
      allEvents.sort((a, b) => b.blockNumber - a.blockNumber);

      // Fetch timestamps for recent events (top 20)
      const recent = allEvents.slice(0, 20);
      for (const ev of recent) {
        try {
          const block = await provider.getBlock(ev.blockNumber);
          if (block) ev.timestamp = block.timestamp;
        } catch {
          // timestamp stays undefined
        }
      }

      setEvents(allEvents);
    } catch (err) {
      console.error("Failed to load events", err);
      setError("Failed to load transaction history.");
    }
    setLoading(false);
  }, [provider]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="scanline-title text-5xl md:text-6xl mb-4">
            Transaction History
          </h1>
          <p className="text-lg max-w-none font-bold" style={{ color: "#000000" }}>
            Review your on-chain staking activity.
          </p>
        </div>
        {provider && (
          <button
            onClick={loadEvents}
            disabled={loading}
            className="ghost-btn px-4 py-2 text-sm"
            style={{ borderRadius: "8px" }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        )}
      </div>

      {/* Content */}
      {!provider ? (
        <div
          className="text-center py-20"
          style={{
            borderRadius: "12px",
            border: "1px dashed var(--color-surface-border)",
            background: "var(--color-surface)",
          }}
        >
          <p style={{ color: "var(--color-text-muted)", fontSize: "1.125rem" }}>
            Connect your wallet to view transaction history.
          </p>
        </div>
      ) : loading && events.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse"
              style={{
                background: "var(--color-surface-high)",
                borderRadius: "8px",
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          className="text-center py-12"
          style={{
            background: "var(--color-surface)",
            borderRadius: "12px",
            border: "1px solid var(--color-surface-border)",
          }}
        >
          <p style={{ color: "var(--color-error)" }}>{error}</p>
          <button
            onClick={loadEvents}
            className="ghost-btn px-4 py-2 text-sm mt-4"
            style={{ borderRadius: "8px" }}
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div
          className="text-center py-20"
          style={{
            background: "var(--color-surface)",
            borderRadius: "12px",
            border: "1px solid var(--color-surface-border)",
          }}
        >
          <p className="text-lg mb-1" style={{ color: "var(--color-text-muted)" }}>
            No transactions yet
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Stake or withdraw tokens to see activity here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((ev, idx) => {
            const meta = EVENT_STYLES[ev.type];
            const isDeposit = ev.type === "Deposit";
            return (
              <div
                key={`${ev.txHash}-${idx}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors"
                style={{
                  background: "var(--color-surface)",
                  borderRadius: "8px",
                  border: "1px solid var(--color-surface-border)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-high)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface)";
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 flex items-center justify-center text-base font-bold shrink-0"
                  style={{
                    background: meta.bg,
                    color: meta.color,
                    borderRadius: "8px",
                  }}
                >
                  {meta.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold text-sm"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {ev.type === "Deposit" ? "Staked" : "Withdrew"} {getPoolSymbol(ev.pid)}
                    </span>
                    {ev.timestamp && (
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {formatTime(ev.timestamp)}
                      </span>
                    )}
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${ev.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs transition-colors flex items-center gap-1"
                    style={{
                      color: "var(--color-text-muted)",
                      fontFamily: "var(--font-mono)",
                      width: "fit-content",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-muted)";
                    }}
                  >
                    {shortenHash(ev.txHash)}
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <span
                    className="font-semibold text-sm tabular-nums"
                    style={{
                      color: isDeposit
                        ? "var(--color-accent-green-text)"
                        : "var(--color-accent-yellow-text)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {isDeposit ? "+" : "-"}
                    {Number(ev.amount).toFixed(2)} {getPoolSymbol(ev.pid)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
