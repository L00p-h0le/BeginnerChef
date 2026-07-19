import { useState, useEffect } from "react";
import { BrowserProvider, parseUnits, formatUnits } from "ethers";
import { getChefContract, getERC20Contract, CHEF_ADDRESS } from "../utils/contracts";

interface PoolCardProps {
  provider: BrowserProvider | null;
  pid: number;
  address: string;
  symbol: string;
  totalAllocPoint: number;
}

export function PoolCard({ provider, pid, address, symbol, totalAllocPoint }: PoolCardProps) {
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [staked, setStaked] = useState("0");
  const [pending, setPending] = useState("0");
  const [allowance, setAllowance] = useState("0");
  const [balance, setBalance] = useState("0");
  const [poolShare, setPoolShare] = useState("0");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    } catch (err) {
      console.error("Error loading pool data", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [provider, pid, totalAllocPoint]);

  const showStatus = (type: "success" | "error", text: string) => {
    setTxStatus({ type, text });
    setTimeout(() => setTxStatus(null), 4000);
  };

  const handleApprove = async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const token = await getERC20Contract(address, provider);
      const tx = await token.approve(CHEF_ADDRESS, parseUnits(stakeAmount || "0"));
      await tx.wait();
      await loadData();
      showStatus("success", "Approved");
    } catch (err) {
      console.error(err);
      showStatus("error", "Approval failed");
    }
    setLoading(false);
  };

  const handleStake = async () => {
    if (!provider || !stakeAmount || Number(stakeAmount) <= 0) return;
    setLoading(true);
    try {
      const chef = await getChefContract(provider);
      const tx = await chef.deposit(pid, parseUnits(stakeAmount));
      await tx.wait();
      setStakeAmount("");
      await loadData();
      showStatus("success", `Staked ${stakeAmount} ${symbol}`);
    } catch (err) {
      console.error(err);
      showStatus("error", "Stake failed");
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!provider || !withdrawAmount || Number(withdrawAmount) <= 0) return;
    if (Number(withdrawAmount) > Number(staked)) {
      showStatus("error", "Exceeds staked balance");
      return;
    }
    setLoading(true);
    try {
      const chef = await getChefContract(provider);
      const tx = await chef.withdraw(pid, parseUnits(withdrawAmount));
      await tx.wait();
      setWithdrawAmount("");
      await loadData();
      showStatus("success", `Withdrew ${withdrawAmount} ${symbol}`);
    } catch (err) {
      console.error(err);
      showStatus("error", "Withdraw failed");
    }
    setLoading(false);
  };

  const handleClaim = async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const chef = await getChefContract(provider);
      const tx = await chef.withdraw(pid, 0); // Claim only
      await tx.wait();
      await loadData();
      showStatus("success", "Rewards claimed");
    } catch (err) {
      console.error(err);
      showStatus("error", "Claim failed");
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
      await tx.wait();
      await loadData();
      showStatus("success", "Emergency Withdrawn");
    } catch (err) {
      console.error(err);
      showStatus("error", "Emergency Withdraw failed");
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
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              background: "var(--color-primary-glow)",
              color: "var(--color-primary)",
            }}
          >
            {symbol.substring(0, 2)}
          </div>
          <div>
            <h3
              className="text-lg font-bold text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {symbol} Pool
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">Earn RWD</p>
          </div>
        </div>
        <span className="pill-badge" style={{
          background: "var(--color-primary-glow)",
          color: "var(--color-primary)",
          border: "1px solid var(--color-primary-border)",
        }}>
          {poolShare}% Share
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-4 rounded-xl"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
            Your Stake
          </p>
          <p className="text-xl font-bold tabular-nums">
            {Number(staked).toFixed(4)}{" "}
            <span className="text-sm font-normal text-[var(--color-text-muted)]">{symbol}</span>
          </p>
        </div>
        <div
          className="p-4 rounded-xl relative overflow-hidden"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--color-primary-border)",
          }}
        >
          {/* Subtle glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, var(--color-primary-glow) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
              Claimable
            </p>
            <p className="text-xl font-bold tabular-nums" style={{ color: "var(--color-primary)" }}>
              {Number(pending).toFixed(4)}{" "}
              <span className="text-sm font-normal text-[var(--color-text-muted)]">RWD</span>
            </p>
            <button
              onClick={handleClaim}
              disabled={loading || Number(pending) === 0}
              className="text-xs mt-2 font-medium transition-colors"
              style={{
                color: Number(pending) > 0 ? "var(--color-primary)" : "var(--color-text-muted)",
              }}
            >
              Claim Rewards →
            </button>
          </div>
        </div>
      </div>

      {/* Stake Input */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Stake
          </label>
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
            Balance: {Number(balance).toFixed(4)} {symbol}
          </span>
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
              className="ghost-btn px-5 rounded-xl text-sm font-semibold whitespace-nowrap"
            >
              Approve
            </button>
          ) : (
            <button
              onClick={handleStake}
              disabled={loading || !stakeAmount || Number(stakeAmount) <= 0}
              className="neo-btn px-5 rounded-xl text-sm font-semibold whitespace-nowrap"
            >
              Stake
            </button>
          )}
        </div>
      </div>

      {/* Withdraw Input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Withdraw
        </label>
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
            className="ghost-btn px-5 rounded-xl text-sm font-semibold whitespace-nowrap"
          >
            Withdraw
          </button>
        </div>
        {Number(staked) > 0 && (
          <button
            onClick={handleEmergencyWithdraw}
            disabled={loading}
            className="mt-1 text-xs font-medium text-left transition-colors hover:underline"
            style={{ color: "var(--color-error)" }}
            title="Use this if normal withdraw fails. You will forfeit your pending rewards."
          >
            Emergency Withdraw (Forfeit Rewards)
          </button>
        )}
      </div>

      {/* Status Message */}
      {txStatus && (
        <p
          className="text-xs font-medium text-center py-1 animate-pulse"
          style={{
            color: txStatus.type === "success" ? "var(--color-success)" : "var(--color-error)",
          }}
        >
          {txStatus.text}
        </p>
      )}
    </div>
  );
}
