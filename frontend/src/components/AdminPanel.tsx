import { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { toast } from "sonner";
import { getChefContract } from "../utils/contracts";

interface AdminPanelProps {
  provider: BrowserProvider | null;
  account: string;
}

export function AdminPanel({ provider, account }: AdminPanelProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);

  // Add Pool State
  const [addAllocPoint, setAddAllocPoint] = useState("");
  const [addTokenAddress, setAddTokenAddress] = useState("");

  // Set Pool State
  const [setPid, setSetPid] = useState("");
  const [setAllocPoint, setSetAllocPoint] = useState("");

  useEffect(() => {
    const checkOwner = async () => {
      if (!provider || !account) {
        setIsOwner(false);
        return;
      }
      try {
        const chef = await getChefContract(provider);
        const ownerAddr = await chef.owner();
        setIsOwner(ownerAddr.toLowerCase() === account.toLowerCase());
      } catch (err) {
        console.error("Failed to check owner", err);
        setIsOwner(false);
      }
    };
    checkOwner();
  }, [provider, account]);

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;
    setLoading(true);
    try {
      const chef = await getChefContract(provider);
      const tx = await chef.add(Number(addAllocPoint), addTokenAddress);
      toast.promise(tx.wait(), {
        loading: "Adding pool...",
        success: "Pool added successfully!",
        error: "Failed to add pool",
      });
      await tx.wait();
      setAddAllocPoint("");
      setAddTokenAddress("");
    } catch (err) {
      console.error(err);
      toast.error("Error adding pool");
    }
    setLoading(false);
  };

  const handleSetPool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;
    setLoading(true);
    try {
      const chef = await getChefContract(provider);
      const tx = await chef.set(Number(setPid), Number(setAllocPoint));
      toast.promise(tx.wait(), {
        loading: "Setting pool alloc point...",
        success: "Pool updated successfully!",
        error: "Failed to update pool",
      });
      await tx.wait();
      setSetPid("");
      setSetAllocPoint("");
    } catch (err) {
      console.error(err);
      toast.error("Error setting pool");
    }
    setLoading(false);
  };

  if (!provider || !account) {
    return (
      <div className="text-center py-20 glass-card">
        <p className="text-lg text-[var(--color-text-muted)]">
          Connect your wallet to access the Admin Panel.
        </p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="text-center py-20 glass-card border border-[var(--color-error)]">
        <p className="text-lg text-[var(--color-error)] font-bold">
          Access Denied
        </p>
        <p className="text-[var(--color-text-muted)] mt-2">
          Only the contract owner can view this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="tight-header-glass">
        <h1 className="scanline-title text-4xl md:text-5xl mb-3">Admin Panel</h1>
        <p className="text-lg font-bold" style={{ color: "#000000" }}>
          Manage staking pools and reward allocations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Add Pool */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
            Add New Pool
          </h2>
          <form onSubmit={handleAddPool} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Allocation Points
              </label>
              <input
                type="number"
                min="0"
                required
                value={addAllocPoint}
                onChange={(e) => setAddAllocPoint(e.target.value)}
                placeholder="e.g. 100"
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Staked Token Address
              </label>
              <input
                type="text"
                required
                value={addTokenAddress}
                onChange={(e) => setAddTokenAddress(e.target.value)}
                placeholder="0x..."
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="neo-btn mt-2 px-5 py-3 text-sm font-semibold"
            >
              Add Pool
            </button>
          </form>
        </div>

        {/* Set Pool */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
            Update Pool Allocation
          </h2>
          <form onSubmit={handleSetPool} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Pool ID (PID)
              </label>
              <input
                type="number"
                min="0"
                required
                value={setPid}
                onChange={(e) => setSetPid(e.target.value)}
                placeholder="e.g. 0"
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                New Allocation Points
              </label>
              <input
                type="number"
                min="0"
                required
                value={setAllocPoint}
                onChange={(e) => setSetAllocPoint(e.target.value)}
                placeholder="e.g. 50"
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="neo-btn mt-2 px-5 py-3 text-sm font-semibold"
            >
              Set Pool
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
