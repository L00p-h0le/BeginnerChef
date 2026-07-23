import { useState } from "react";
import { BrowserProvider, parseUnits } from "ethers";
import { toast } from "sonner";
import { getERC20Contract, POOLS, REWARD_TOKEN_ADDRESS } from "../utils/contracts";
import { TokenIcon } from "./TokenIcon";

interface FaucetPageProps {
  provider: BrowserProvider | null;
}

interface TokenConfig {
  address: string;
  symbol: string;
  label: string;
  description: string;
  accentBg: string;
  accentText: string;
}

function buildTokenList(): TokenConfig[] {
  const tokens: TokenConfig[] = POOLS.map((pool) => ({
    address: pool.address,
    symbol: pool.symbol,
    label: `${pool.symbol} Token`,
    description: `${pool.symbol} per request`,
    accentBg: "var(--color-surface-high)",
    accentText: "var(--color-text-primary)",
  }));

  tokens.push({
    address: REWARD_TOKEN_ADDRESS,
    symbol: "RWD",
    label: "Reward Token",
    description: "RWD per request",
    accentBg: "var(--color-accent-green)",
    accentText: "var(--color-accent-green-text)",
  });

  return tokens;
}

const MINT_AMOUNT = "1000";

export function FaucetPage({ provider }: FaucetPageProps) {
  const [loadingToken, setLoadingToken] = useState<string | null>(null);

  const tokens = buildTokenList();

  const mintTokens = async (token: TokenConfig) => {
    if (!provider) return;
    setLoadingToken(token.address);

    try {
      const contract = await getERC20Contract(token.address, provider);
      const signer = await provider.getSigner();
      const userAddr = await signer.getAddress();

      const tx = await contract.mint(userAddr, parseUnits(MINT_AMOUNT));
      await tx.wait();
      toast.success(`Minted ${MINT_AMOUNT} ${token.symbol}`);
    } catch (err) {
      console.error(err);
      toast.error(`Minting ${token.symbol} failed`);
    }
    setLoadingToken(null);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="tight-header-glass">
        <h1 className="scanline-title text-5xl md:text-6xl mb-3">
          Faucet
        </h1>
        <p className="text-lg font-bold" style={{ color: "#000000" }}>
          Mint Test Tokens
        </p>
      </div>

      {/* Token Cards */}
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
            Connect your wallet to mint test tokens.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token) => (
            <div
              key={token.address}
              className="relative flex flex-col gap-4 p-6 transition-all duration-200"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-surface-border)",
                borderRadius: "12px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "#DCDCDC";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-surface-border)";
              }}
            >
              {/* Token Badge */}
              <div className="flex items-center gap-3">
                <TokenIcon symbol={token.symbol} className="w-10 h-10 shrink-0" />
                <div>
                  <h3
                    className="font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {token.label}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {MINT_AMOUNT} {token.description}
                  </p>
                </div>
              </div>

              {/* Mint Button */}
              <button
                onClick={() => mintTokens(token)}
                disabled={loadingToken !== null}
                className="neo-btn px-4 py-2.5 text-sm font-semibold w-full"
                style={{
                  borderRadius: "8px",
                  ...(loadingToken === token.address ? { opacity: 0.7 } : {}),
                }}
              >
                {loadingToken === token.address ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
                      style={{
                        borderColor: "rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                      }}
                    />
                    Minting...
                  </span>
                ) : (
                  "Mint"
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
