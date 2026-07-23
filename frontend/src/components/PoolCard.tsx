import { useState, useEffect } from "react";
import { BrowserProvider, parseUnits, formatUnits } from "ethers";
import { toast } from "sonner";
import { getChefContract, getERC20Contract, CHEF_ADDRESS } from "../utils/contracts";

interface PoolCardProps {
  provider: BrowserProvider | null;
  pid: number;
  address: string;
  symbol: string;
  totalAllocPoint: number;
  rewardRate: string;
}

export function PoolCard({ provider, pid, address, symbol, totalAllocPoint, rewardRate }: PoolCardProps) {
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [staked, setStaked] = useState("0");
  const [pending, setPending] = useState("0");
  const [allowance, setAllowance] = useState("0");
  const [balance, setBalance] = useState("0");
  const [poolShare, setPoolShare] = useState("0");
  const [poolTVL, setPoolTVL] = useState("0");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!provider) return;
    try {
      const signer = await provider.getSigner();
      const userAddr = await signer.getAddress();

      const chef = await getChefContract(provider);
      const token = await getERC20Contract(address, provider);

      // User Info
      const userInfo = await chef.userInfo(pid, userAddr);
      setStaked(formatUnits(userInfo[0]));

      const pRewards = await chef.pendingRewards(pid, userAddr);
      setPending(formatUnits(pRewards));

      const bal = await token.balanceOf(userAddr);
      setBalance(formatUnits(bal));

      const allow = await token.allowance(userAddr, CHEF_ADDRESS);
      setAllowance(formatUnits(allow));

      const poolInfo = await chef.poolInfo(pid);
      if (totalAllocPoint > 0) {
        setPoolShare(((Number(poolInfo[1]) / totalAllocPoint) * 100).toFixed(1));
      }

      const pTVL = await token.balanceOf(CHEF_ADDRESS);
      setPoolTVL(formatUnits(pTVL));
    } catch (err) {
      console.error("Error loading pool data", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [provider, pid, totalAllocPoint]);

  const handleApprove = async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const token = await getERC20Contract(address, provider);
      const tx = await token.approve(CHEF_ADDRESS, parseUnits(stakeAmount || "0"));
      toast.promise(tx.wait(), {
        loading: "Approving...",
        success: "Approved",
        error: "Approval failed"
      });
      await tx.wait();
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Approval failed");
    }
    setLoading(false);
  };

  const handleStake = async () => {
    if (!provider || !stakeAmount || Number(stakeAmount) <= 0) return;
    setLoading(true);
    try {
      const chef = await getChefContract(provider);
      const tx = await chef.deposit(pid, parseUnits(stakeAmount));
      toast.promise(tx.wait(), {
        loading: "Staking...",
        success: `Staked ${stakeAmount} ${symbol}`,
        error: "Stake failed"
      });
      await tx.wait();
      setStakeAmount("");
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Stake failed");
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!provider || !withdrawAmount || Number(withdrawAmount) <= 0) return;
    if (Number(withdrawAmount) > Number(staked)) {
      toast.error("Exceeds staked balance");
      return;
    }
    setLoading(true);
    try {
      const chef = await getChefContract(provider);
      const tx = await chef.withdraw(pid, parseUnits(withdrawAmount));
      toast.promise(tx.wait(), {
        loading: "Withdrawing...",
        success: `Withdrew ${withdrawAmount} ${symbol}`,
        error: "Withdraw failed"
      });
      await tx.wait();
      setWithdrawAmount("");
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Withdraw failed");
    }
    setLoading(false);
  };

  const handleClaim = async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const chef = await getChefContract(provider);
      const tx = await chef.withdraw(pid, 0); // Claim only
      toast.promise(tx.wait(), {
        loading: "Claiming rewards...",
        success: "Rewards claimed",
        error: "Claim failed"
      });
      await tx.wait();
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Claim failed");
    }
    setLoading(false);
  };

  const handleEmergencyWithdraw = async () => {
    if (!provider) return;
    // Confirm with user since this forfeits rewards
    if (!window.confirm("Are you sure? Emergency Withdraw will forfeit all your pending rewards.")) return;
    setLoading(true);
    try {
      const chef = await getChefContract(provider);
      const tx = await chef.emergencyWithdraw(pid);
      toast.promise(tx.wait(), {
        loading: "Emergency withdrawing...",
        success: "Emergency Withdrawn",
        error: "Emergency Withdraw failed"
      });
      await tx.wait();
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Emergency Withdraw failed");
    }
    setLoading(false);
  };

  const needsApproval = Number(stakeAmount) > Number(allowance);

  return (
    <div className="glass-card p-6 flex flex-col gap-5 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center text-sm font-bold"
            style={{
              background: "var(--color-accent-blue)",
              color: "var(--color-accent-blue-text)",
              borderRadius: "8px",
            }}
          >
            {symbol.substring(0, 2)}
          </div>
          <div>
            <h3
              className="text-lg font-bold"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
                fontWeight: 400,
              }}
            >
              {symbol} Pool
            </h3>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Earn RWD</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span
            className="pill-badge"
            style={{
              background: "var(--color-accent-yellow)",
              color: "var(--color-accent-yellow-text)",
            }}
          >
            {poolShare}% Share
          </span>
          {Number(poolTVL) > 0 && (
            <span
              className="pill-badge relative group flex items-center gap-1"
              style={{
                background: "var(--color-accent-green)",
                color: "var(--color-accent-green-text)",
              }}
            >
              {(( (Number(poolShare) / 100) * Number(rewardRate) * 31536000 ) / Number(poolTVL) * 100).toFixed(0)}% APR
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 cursor-help">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div className="absolute hidden group-hover:block bottom-full mb-2 right-0 w-48 p-2 text-xs normal-case tracking-normal z-10 text-left shadow-lg"
                   style={{ background: "var(--color-surface-high)", color: "var(--color-text-primary)", border: "1px solid var(--color-surface-border)", borderRadius: "6px" }}>
                Assumes 1:1 value parity between staked and reward tokens — no price oracle is used in this testnet demo.
              </div>
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-4"
          style={{
            background: "var(--color-surface-high)",
            border: "1px solid var(--color-surface-border)",
            borderRadius: "8px",
          }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}
          >
            Your Stake
          </p>
          <p
            className="text-xl font-bold tabular-nums"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {Number(staked).toFixed(4)}{" "}
            <span
              className="text-sm font-normal"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-body)" }}
            >
              {symbol}
            </span>
          </p>
        </div>
        <div
          className="p-4"
          style={{
            background: "var(--color-surface-high)",
            border: "1px solid var(--color-surface-border)",
            borderRadius: "8px",
          }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}
          >
            Claimable
          </p>
          <p
            className="text-xl font-bold tabular-nums"
            style={{
              color: "var(--color-accent-green-text)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {Number(pending).toFixed(4)}{" "}
            <span
              className="text-sm font-normal"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-body)" }}
            >
              RWD
            </span>
          </p>
          <button
            onClick={handleClaim}
            disabled={loading || Number(pending) === 0}
            className="text-xs mt-2 font-medium transition-colors"
            style={{
              color: Number(pending) > 0 ? "var(--color-accent-green-text)" : "var(--color-text-muted)",
            }}
          >
            Claim Rewards
          </button>
        </div>
      </div>

      {/* Stake Input */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}
          >
            Stake
          </label>
          <div className="flex items-center gap-2">
            <span
              className="text-xs tabular-nums"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              Balance: {Number(balance).toFixed(4)} {symbol}
            </span>
            <button
              onClick={() => setStakeAmount(balance)}
              className="text-xs font-semibold px-2 py-0.5 transition-colors"
              style={{
                background: "var(--color-surface-high)",
                border: "1px solid var(--color-surface-border)",
                borderRadius: "4px",
                color: "var(--color-text-primary)",
              }}
              title="Use max balance"
            >
              Max
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            placeholder="Amount to stake"
            value={stakeAmount}
            onChange={(e) => {
              const val = e.target.value;
              if (Number(val) >= 0 || val === "") setStakeAmount(val);
            }}
            className="input-field flex-1"
          />
          {needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={loading}
              className="ghost-btn px-5 text-sm font-semibold whitespace-nowrap"
              style={{ borderRadius: "8px" }}
            >
              Approve
            </button>
          ) : (
            <button
              onClick={handleStake}
              disabled={loading || !stakeAmount || Number(stakeAmount) <= 0}
              className="neo-btn px-5 text-sm font-semibold whitespace-nowrap"
              style={{ borderRadius: "8px" }}
            >
              Stake
            </button>
          )}
        </div>
      </div>

      {/* Withdraw Input */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)", letterSpacing: "0.05em" }}
          >
            Withdraw
          </label>
          <button
            onClick={() => setWithdrawAmount(staked)}
            className="text-xs font-semibold px-2 py-0.5 transition-colors"
            style={{
              background: "var(--color-surface-high)",
              border: "1px solid var(--color-surface-border)",
              borderRadius: "4px",
              color: "var(--color-text-primary)",
            }}
            title="Withdraw all staked"
          >
            Max
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            placeholder="Amount to withdraw"
            value={withdrawAmount}
            onChange={(e) => {
              const val = e.target.value;
              if (Number(val) >= 0 || val === "") setWithdrawAmount(val);
            }}
            className="input-field flex-1"
          />
          <button
            onClick={handleWithdraw}
            disabled={loading || !withdrawAmount || Number(withdrawAmount) <= 0}
            className="ghost-btn px-5 text-sm font-semibold whitespace-nowrap"
            style={{ borderRadius: "8px" }}
          >
            Withdraw
          </button>
        </div>
        {Number(staked) > 0 && (
          <button
            onClick={handleEmergencyWithdraw}
            disabled={loading}
            className="w-full mt-3 py-2 text-sm font-bold transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--color-accent-red)",
              color: "var(--color-accent-red-text)",
              border: "1px solid rgba(159, 47, 45, 0.2)",
              borderRadius: "8px",
            }}
            title="Use this if normal withdraw fails. You will forfeit your pending rewards."
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Emergency Withdraw (Forfeit Rewards)
          </button>
        )}
      </div>

    </div>
  );
}
