import { useState } from "react";
import { BrowserProvider, parseUnits } from "ethers";
import { getERC20Contract, POOLS, REWARD_TOKEN_ADDRESS } from "../utils/contracts";

interface FaucetPageProps {
  provider: BrowserProvider | null;
}

interface TokenConfig {
  address: string;
  symbol: string;
  label: string;
  description: string;
  accentColor: string;
}

function buildTokenList(): TokenConfig[] {
  const tokens: TokenConfig[] = POOLS.map((pool) => ({
    address: pool.address,
    symbol: pool.symbol,
    label: `Stake Token ${pool.pid + 1}`,
    description: `${pool.symbol} per request`,
    accentColor: pool.pid === 0 ? "#8b5cf6" : "#f59e0b",
  }));

  tokens.push({
    address: REWARD_TOKEN_ADDRESS,
    symbol: "RWD",
    label: "Reward Token",
    description: "RWD per request",
    accentColor: "#10b981",
  });

  return tokens;
}

const MINT_AMOUNT = "1000";

export function FaucetPage({ provider }: FaucetPageProps) {
  const [loadingToken, setLoadingToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<Record<string, { type: "success" | "error"; text: string }>>({});

  const tokens = buildTokenList();

  const mintTokens = async (token: TokenConfig) => {
    if (!provider) return;
    setLoadingToken(token.address);
    setStatusMessage((prev) => ({ ...prev, [token.address]: { type: "success", text: "" } }));

    try {
      const contract = await getERC20Contract(token.address, provider);
      const signer = await provider.getSigner();
      const userAddr = await signer.getAddress();

      const tx = await contract.mint(userAddr, parseUnits(MINT_AMOUNT));
      await tx.wait();
      setStatusMessage((prev) => ({
        ...prev,
        [token.address]: { type: "success", text: `Minted ${MINT_AMOUNT} ${token.symbol}` },
      }));
    } catch (err) {
      console.error(err);
      setStatusMessage((prev) => ({
        ...prev,
        [token.address]: { type: "error", text: "Mint failed" },
      }));
    }
    setLoadingToken(null);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1
          className="text-4xl font-extrabold mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Test Tokens
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg max-w-xl">
          Mint test assets to interact with the BeginnerChef protocol on the
          Sepolia network.
        </p>
      </div>

      {/* Token Cards */}
      {!provider ? (
        <div className="text-center py-20 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--color-surface-border)", background: "rgba(0,0,0,0.2)" }}>
          <p className="text-[var(--color-text-secondary)] text-lg">
            Connect your wallet to mint test tokens.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token) => (
            <div
              key={token.address}
              className="relative flex flex-col gap-4 p-6 rounded-2xl transition-all duration-200"
              style={{
                background: "var(--color-surface)",
                border: "1px dashed var(--color-primary-border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = token.accentColor;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 25px ${token.accentColor}15`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-primary-border)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              {/* Token Badge */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: `${token.accentColor}25`, color: token.accentColor }}
                >
                  {token.symbol.substring(0, 3)}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{token.label}</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {MINT_AMOUNT} {token.description}
                  </p>
                </div>
              </div>

              {/* Mint Button */}
              <button
                onClick={() => mintTokens(token)}
                disabled={loadingToken !== null}
                className="neo-btn px-4 py-2.5 rounded-xl text-sm font-semibold w-full"
                style={
                  loadingToken === token.address
                    ? { opacity: 0.7 }
                    : {}
                }
              >
                {loadingToken === token.address ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Minting…
                  </span>
                ) : (
                  "Mint"
                )}
              </button>

              {/* Status */}
              {statusMessage[token.address]?.text && (
                <p
                  className="text-xs font-medium text-center"
                  style={{
                    color:
                      statusMessage[token.address].type === "success"
                        ? "var(--color-success)"
                        : "var(--color-error)",
                  }}
                >
                  {statusMessage[token.address].text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
