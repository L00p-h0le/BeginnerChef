import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useWeb3 } from "./hooks/useWeb3";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { FaucetPage } from "./components/FaucetPage";
import { HistoryPage } from "./components/HistoryPage";
import { AdminPanel } from "./components/AdminPanel";

function App() {
  const {
    provider,
    account,
    isWrongNetwork,
    totalAllocPoint,
    rewardRate,
    rwdBalance,
    globalTVL,
    totalUserStaked,
    totalUserClaimable,
    connectWallet,
    disconnectWallet,
  } = useWeb3();

  const location = useLocation();

  return (
    <div
      className={`min-h-screen flex flex-col ${
        location.pathname !== "/" ? "dotted-grid-bg" : ""
      }`}
    >
      <Toaster theme="light" position="bottom-right" />

      {/* ── Navbar ── */}
      <Navbar
        isWrongNetwork={isWrongNetwork}
        account={account}
        rwdBalance={rwdBalance}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
      />

      {/* ── Page Content ── */}
      <Routes>
        {/* Landing page gets full width */}
        <Route path="/" element={<LandingPage connectWallet={connectWallet} />} />

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
                globalTVL={globalTVL}
                totalUserStaked={totalUserStaked}
                totalUserClaimable={totalUserClaimable}
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
        <Route
          path="/admin"
          element={
            <main className="max-w-[1200px] w-full mx-auto px-6 py-10 flex-1">
              <AdminPanel provider={provider} account={account} />
            </main>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
