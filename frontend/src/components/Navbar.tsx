import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/history", label: "History" },
  { to: "/faucet", label: "Faucet" },
  { to: "/admin", label: "Admin" },
];

interface NavbarProps {
  isWrongNetwork: boolean;
  account: string;
  rwdBalance: string;
  connectWallet: () => void;
  disconnectWallet: () => void;
}

export function Navbar({
  isWrongNetwork,
  account,
  rwdBalance,
  connectWallet,
  disconnectWallet,
}: NavbarProps) {
  return (
    <>
      {/* ── Desktop Navbar ── */}
      <nav
        className="navbar mx-4 mt-4 px-6 py-3.5 flex justify-between items-center sticky top-4 z-50 relative"
        style={{
          background: "#ffffff",
          backgroundColor: "#ffffff",
          border: "1px solid #e5e5e5",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <NavLink to="/" className="flex items-center shrink-0">
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

        {/* Center Nav Items */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
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
    </>
  );
}
