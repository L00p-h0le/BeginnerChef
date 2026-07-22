import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Toaster } from "sonner";
import { BrowserProvider, formatEther } from "ethers";
import {
  getProvider,
  getChefContract,
  getERC20Contract,
  REWARD_TOKEN_ADDRESS,
  POOLS,
  EXPECTED_CHAIN_ID,
} from "./utils/contracts";
import { PoolCard } from "./components/PoolCard";
import { FaucetPage } from "./components/FaucetPage";
import { HistoryPage } from "./components/HistoryPage";
import { LandingPage } from "./components/LandingPage";

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

/* ── Dashboard ── */

function Dashboard({
  provider,
  account,
  connectWallet,
  totalAllocPoint,
  rewardRate,
}: {
  provider: BrowserProvider | null;
  account: string;
  connectWallet: () => void;
  totalAllocPoint: number;
  rewardRate: string;
}) {
  const setRef = useScrollReveal();

  return (
    <div>
      {/* Header & Stats */}
      <div
        ref={setRef(0)}
        className="scroll-entry mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6"
      >
        <div>
          <h1 className="scanline-title text-5xl md:text-6xl mb-4">
            Active Pools
          </h1>
          <p
            className="text-lg max-w-xl"
            style={{ color: "var(--color-text-muted)" }}
          >
            Deposit LP tokens to earn RWD rewards in real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 shrink-0">
          <div
            className="px-6 py-5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-surface-border)",
              borderRadius: "8px",
              minWidth: "180px",
            }}
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
            className="px-6 py-5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-surface-border)",
              borderRadius: "8px",
              minWidth: "140px",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Active Pools
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {POOLS.length}
            </p>
          </div>
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

/* ── Navigation ── */

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/history", label: "History" },
  { to: "/faucet", label: "Faucet" },
];

/* ── App Shell ── */

function App() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>("");
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [totalAllocPoint, setTotalAllocPoint] = useState<number>(0);
  const [rewardRate, setRewardRate] = useState<string>("0");
  const [rwdBalance, setRwdBalance] = useState<string>("0");

  const connectWallet = async () => {
    const prov = getProvider();
    if (!prov) {
      alert("Please install MetaMask or another Web3 wallet!");
      return;
    }
    try {
      const accounts = await prov.send("eth_requestAccounts", []);
      const network = await prov.getNetwork();

      if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
        setIsWrongNetwork(true);
        try {
          await prov.send("wallet_switchEthereumChain", [
            { chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` },
          ]);
          setIsWrongNetwork(false);
        } catch (switchError) {
          console.error(switchError);
        }
      }

      setAccount(accounts[0]);
      setProvider(prov);
    } catch (err) {
      console.error(err);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setAccount("");
    setTotalAllocPoint(0);
    setRewardRate("0");
    setRwdBalance("0");
  };

  const loadGlobalData = async () => {
    if (!provider) return;
    try {
      const chef = await getChefContract(provider);
      const alloc = await chef.totalAllocPoint();
      setTotalAllocPoint(Number(alloc));

      const rate = await chef.rewardPerSecond();
      setRewardRate(formatEther(rate));

      try {
        const signer = await provider.getSigner();
        const userAddr = await signer.getAddress();
        const rwdToken = await getERC20Contract(
          REWARD_TOKEN_ADDRESS,
          provider
        );
        const bal = await rwdToken.balanceOf(userAddr);
        setRwdBalance(formatEther(bal));
      } catch (e) {
        console.error("Error fetching RWD balance", e);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (provider) {
      loadGlobalData();
      const interval = setInterval(loadGlobalData, 5000);
      return () => clearInterval(interval);
    }
  }, [provider]);

  useEffect(() => {
    const checkConnection = async () => {
      const prov = getProvider();
      if (prov) {
        const accounts = await prov.listAccounts();
        if (accounts.length > 0) {
          connectWallet();
        }
      }
    };
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster theme="light" position="bottom-right" />

      {/* ── Navbar ── */}
      <nav
        className="mx-4 mt-4 px-6 py-3.5 flex justify-between items-center sticky top-4 z-50"
        style={{
          background: "rgba(247, 246, 243, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--color-surface-border)",
          borderRadius: "12px",
        }}
      >
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <div
              className="w-7 h-7"
              style={{
                background: "var(--color-text-primary)",
                borderRadius: "6px",
              }}
            />
            <h1
              className="text-lg font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-text-primary)",
              }}
            >
              Beginner
              <span style={{ color: "var(--color-text-muted)" }}>Chef</span>
            </h1>
          </NavLink>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isWrongNetwork ? (
            <span
              className="pill-badge"
              style={{
                color: "var(--color-error)",
                background: "var(--color-error-bg)",
              }}
            >
              Wrong Network
            </span>
          ) : (
            <span
              className="text-xs font-medium px-3 py-1.5 hidden sm:inline-flex items-center gap-1.5"
              style={{
                color: "var(--color-text-muted)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-surface-border)",
                borderRadius: "6px",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: "var(--color-warning)" }}
              />
              Sepolia
            </span>
          )}

          {account ? (
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-3 py-1.5 hidden sm:inline-block"
                style={{
                  color: "var(--color-accent-green-text)",
                  background: "var(--color-accent-green)",
                  borderRadius: "6px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {Number(rwdBalance).toFixed(2)} RWD
              </span>
              <button
                onClick={disconnectWallet}
                className="px-3.5 py-1.5 font-mono text-xs transition-colors"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-surface-border)",
                  borderRadius: "6px",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#9F2F2D";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#9F2F2D";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-error-bg)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--color-surface-border)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-muted)";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-surface)";
                }}
              >
                {account.slice(0, 6)}...{account.slice(-4)}
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="neo-btn px-5 py-2 text-sm font-semibold"
              style={{ borderRadius: "6px" }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {/* ── Mobile Nav ── */}
      <div className="md:hidden flex gap-1 mx-4 mt-3 overflow-x-auto pb-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-link text-xs whitespace-nowrap ${isActive ? "active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* ── Page Content ── */}
      <Routes>
        {/* Landing page gets full width — no constrained main wrapper */}
        <Route path="/" element={<LandingPage />} />

        {/* App pages get the constrained layout */}
        <Route
          path="/dashboard"
          element={
            <main className="max-w-[1200px] w-full mx-auto px-6 py-10 flex-1">
              <Dashboard
                provider={provider}
                account={account}
                connectWallet={connectWallet}
                totalAllocPoint={totalAllocPoint}
                rewardRate={rewardRate}
              />
            </main>
          }
        />
        <Route
          path="/faucet"
          element={
            <main className="max-w-[1200px] w-full mx-auto px-6 py-10 flex-1">
              <FaucetPage provider={provider} />
            </main>
          }
        />
        <Route
          path="/history"
          element={
            <main className="max-w-[1200px] w-full mx-auto px-6 py-10 flex-1">
              <HistoryPage provider={provider} />
            </main>
          }
        />
      </Routes>

      {/* ── Footer ── */}
      <footer
        className="px-6 py-6 mt-auto flex flex-wrap items-center justify-between gap-4 text-xs"
        style={{
          borderTop: "1px solid var(--color-surface-border)",
          color: "var(--color-text-muted)",
        }}
      >
        <span>&copy; {new Date().getFullYear()} BeginnerChef Protocol</span>
        <div className="flex gap-4">
          <span className="hover:text-[var(--color-text-primary)] cursor-pointer transition-colors">
            Docs
          </span>
          <span className="hover:text-[var(--color-text-primary)] cursor-pointer transition-colors">
            Security
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
