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

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  Deposit: { icon: "↓", color: "var(--color-success)" },
  Withdraw: { icon: "↑", color: "var(--color-warning)" },
};

function getPoolSymbol(pid: number): string {
  const pool = POOLS.find((p) => p.pid === pid);
  return pool ? pool.symbol : `PID-${pid}`;
}

function shortenHash(hash: string): string {
  return `${hash.substring(0, 6)}…${hash.substring(hash.length - 4)}`;
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1
            className="text-4xl font-extrabold mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Transaction History
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg max-w-xl">
            Review your on-chain staking activity.
          </p>
        </div>
        {provider && (
          <button
            onClick={loadEvents}
            disabled={loading}
            className="ghost-btn px-4 py-2 rounded-xl text-sm"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>

      {/* Content */}
      {!provider ? (
        <div
          className="text-center py-20 rounded-2xl border border-dashed"
          style={{
            borderColor: "var(--color-surface-border)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <p className="text-[var(--color-text-secondary)] text-lg">
            Connect your wallet to view transaction history.
          </p>
        </div>
      ) : loading && events.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl animate-pulse"
              style={{ background: "var(--color-surface)" }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ background: "var(--color-surface)" }}
        >
          <p className="text-[var(--color-error)]">{error}</p>
          <button
            onClick={loadEvents}
            className="ghost-btn px-4 py-2 rounded-lg text-sm mt-4"
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div
          className="text-center py-20 rounded-2xl"
          style={{ background: "var(--color-surface)" }}
        >
          <p className="text-[var(--color-text-muted)] text-lg mb-1">
            No transactions yet
          </p>
          <p className="text-[var(--color-text-muted)] text-sm">
            Stake or withdraw tokens to see activity here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((ev, idx) => {
            const meta = EVENT_ICONS[ev.type];
            const isDeposit = ev.type === "Deposit";
            return (
              <div
                key={`${ev.txHash}-${idx}`}
                className="flex items-center gap-4 px-5 py-4 rounded-xl transition-colors"
                style={{ background: "var(--color-surface)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-high)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface)";
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                  style={{
                    background: `${meta.color}18`,
                    color: meta.color,
                  }}
                >
                  {meta.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                      {ev.type === "Deposit" ? "Staked" : "Withdrew"} {getPoolSymbol(ev.pid)}
                    </span>
                    {ev.timestamp && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatTime(ev.timestamp)}
                      </span>
                    )}
                  </div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${ev.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors font-mono"
                  >
                    {shortenHash(ev.txHash)}
                  </a>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <span
                    className="font-semibold text-sm tabular-nums"
                    style={{ color: isDeposit ? "var(--color-success)" : "var(--color-warning)" }}
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
