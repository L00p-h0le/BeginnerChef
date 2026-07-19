import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { BrowserProvider, formatEther } from 'ethers'
import { getProvider, getChefContract, getERC20Contract, REWARD_TOKEN_ADDRESS, POOLS, EXPECTED_CHAIN_ID } from './utils/contracts'
import { PoolCard } from './components/PoolCard'
import { FaucetPage } from './components/FaucetPage'
import { HistoryPage } from './components/HistoryPage'

function Dashboard({
  provider,
  account,
  totalAllocPoint,
  rewardRate,
}: {
  provider: BrowserProvider | null;
  account: string;
  totalAllocPoint: number;
  rewardRate: string;
}) {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="glass-card p-8 md:p-10 rounded-3xl relative overflow-hidden">
        <div
          className="absolute top-[-40%] left-[-8%] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{ background: "var(--color-primary-glow)", filter: "blur(100px)" }}
        />
        <div
          className="absolute bottom-[-40%] right-[-8%] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{ background: "rgba(109, 40, 217, 0.12)", filter: "blur(100px)" }}
        />

        <div className="relative z-10">
          <h1
            className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
          >
            Master DeFi Farming
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mb-8">
            Stake assets, earn RWD tokens, and watch your portfolio grow with
            institutional-grade security.
          </p>

          <div className="flex flex-wrap gap-4">
            <div
              className="px-6 py-5 rounded-2xl min-w-[180px]"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--color-surface-border)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                Global Reward Rate
              </p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-primary)" }}>
                {rewardRate}{" "}
                <span className="text-sm font-normal text-[var(--color-text-muted)]">
                  RWD/sec
                </span>
              </p>
            </div>
            <div
              className="px-6 py-5 rounded-2xl min-w-[140px]"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--color-surface-border)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                Active Pools
              </p>
              <p className="text-2xl font-bold tabular-nums">{POOLS.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Active Pools */}
      <section>
        <h2
          className="text-2xl font-bold mb-6 flex items-center gap-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span
            className="w-1.5 h-7 rounded-full block"
            style={{ background: "var(--color-primary)" }}
          />
          Active Pools
        </h2>

        {!account ? (
          <div
            className="text-center py-20 rounded-2xl border border-dashed"
            style={{
              borderColor: "var(--color-surface-border)",
              background: "rgba(0,0,0,0.15)",
            }}
          >
            <p className="text-[var(--color-text-secondary)] text-lg">
              Connect your wallet to view and interact with pools.
            </p>
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

const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/history", label: "History" },
  { to: "/faucet", label: "Faucet" },
];

function App() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [account, setAccount] = useState<string>('')
  const [isWrongNetwork, setIsWrongNetwork] = useState(false)
  const [totalAllocPoint, setTotalAllocPoint] = useState<number>(0)
  const [rewardRate, setRewardRate] = useState<string>("0")
  const [rwdBalance, setRwdBalance] = useState<string>("0")

  const connectWallet = async () => {
    const prov = getProvider()
    if (!prov) {
      alert("Please install MetaMask or another Web3 wallet!")
      return
    }
    try {
      const accounts = await prov.send("eth_requestAccounts", [])
      const network = await prov.getNetwork()

      if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
        setIsWrongNetwork(true)
        try {
          await prov.send("wallet_switchEthereumChain", [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }])
          setIsWrongNetwork(false)
        } catch (switchError) {
          console.error(switchError)
        }
      }

      setAccount(accounts[0])
      setProvider(prov)
    } catch (err) {
      console.error(err)
    }
  }

  const disconnectWallet = () => {
    setProvider(null)
    setAccount('')
    setTotalAllocPoint(0)
    setRewardRate("0")
    setRwdBalance("0")
  }

  const loadGlobalData = async () => {
    if (!provider) return
    try {
      const chef = await getChefContract(provider)
      const alloc = await chef.totalAllocPoint()
      setTotalAllocPoint(Number(alloc))

      const rate = await chef.rewardPerSecond()
      setRewardRate(formatEther(rate))

      try {
        const signer = await provider.getSigner()
        const userAddr = await signer.getAddress()
        const rwdToken = await getERC20Contract(REWARD_TOKEN_ADDRESS, provider)
        const bal = await rwdToken.balanceOf(userAddr)
        setRwdBalance(formatEther(bal))
      } catch (e) {
        console.error("Error fetching RWD balance", e)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (provider) {
      loadGlobalData()
      const interval = setInterval(loadGlobalData, 5000)
      return () => clearInterval(interval)
    }
  }, [provider])

  useEffect(() => {
    // Auto-connect if already authorized
    const checkConnection = async () => {
      const prov = getProvider()
      if (prov) {
        const accounts = await prov.listAccounts()
        if (accounts.length > 0) {
          connectWallet()
        }
      }
    }
    checkConnection()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster theme="dark" position="bottom-right" />
      {/* ── Navbar ── */}
      <nav
        className="glass-card mx-4 mt-4 px-6 py-3.5 flex justify-between items-center rounded-2xl sticky top-4 z-50"
      >
        <div className="flex items-center gap-6">
          {/* Brand */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <div
              className="w-8 h-8 rounded-full"
              style={{
                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dim))",
              }}
            />
            <h1
              className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Beginner<span style={{ color: "var(--color-primary)" }}>Chef</span>
            </h1>
          </NavLink>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
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
          {/* Network badge */}
          {isWrongNetwork ? (
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                color: "var(--color-error)",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              Wrong Network
            </span>
          ) : (
            <span
              className="text-xs font-medium px-3 py-1.5 rounded-full hidden sm:inline-flex items-center gap-1.5"
              style={{
                color: "var(--color-text-secondary)",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--color-surface-border)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: "var(--color-warning)" }}
              />
              Sepolia
            </span>
          )}

          {/* Wallet */}
          {account ? (
            <div className="flex items-center gap-2">
              <span 
                className="text-xs font-bold px-3 py-1.5 rounded-xl hidden sm:inline-block"
                style={{
                  color: "var(--color-primary)",
                  background: "var(--color-primary-glow)",
                  border: "1px solid var(--color-primary-border)"
                }}
              >
                {Number(rwdBalance).toFixed(2)} RWD
              </span>
              <button
                onClick={disconnectWallet}
                className="px-3.5 py-1.5 rounded-xl font-mono text-xs transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid var(--color-surface-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {account.slice(0, 6)}...{account.slice(-4)}
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="neo-btn px-5 py-2 rounded-full text-sm font-semibold"
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
            end={item.to === "/"}
            className={({ isActive }) =>
              `nav-link text-xs whitespace-nowrap ${isActive ? "active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* ── Page Content ── */}
      <main className="max-w-[1200px] w-full mx-auto px-6 py-8 flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                provider={provider}
                account={account}
                totalAllocPoint={totalAllocPoint}
                rewardRate={rewardRate}
              />
            }
          />
          <Route path="/faucet" element={<FaucetPage provider={provider} />} />
          <Route path="/history" element={<HistoryPage provider={provider} />} />
        </Routes>
      </main>

      {/* ── Footer ── */}
      <footer
        className="px-6 py-6 mt-auto flex flex-wrap items-center justify-between gap-4 text-xs"
        style={{
          borderTop: "1px solid var(--color-surface-border)",
          color: "var(--color-text-muted)",
        }}
      >
        <span>© {new Date().getFullYear()} BeginnerChef Protocol</span>
        <div className="flex gap-4">
          <span className="hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors">
            Docs
          </span>
          <span className="hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors">
            Security
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
