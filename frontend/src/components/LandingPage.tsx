import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

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

const FEATURES = [
  {
    title: "Multi-Pool Staking",
    description:
      "Run concurrent pools with independent tokens and reward weights. Rebalance allocations mid-stream without corrupting accrued rewards.",
  },
  {
    title: "Pre-Funded Rewards",
    description:
      "No mint privileges required. The contract pays only what it holds. Total payouts never exceed funded balance.",
  },
  {
    title: "Emergency Exit",
    description:
      "Withdraw staked principal at any time, independent of reward logic. Zero external dependencies on the escape path.",
  },
];

export function LandingPage() {
  const setRef = useScrollReveal();

  return (
    <div className="overflow-x-hidden w-full max-w-full">

      {/* ── Hero: Full VH ── */}
      <section
        ref={setRef(0)}
        className="scroll-entry min-h-screen flex items-center"
        style={{ padding: "0 clamp(1.5rem, 4vw, 3rem)" }}
      >
        <div
          className="w-full"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="py-10 md:py-16 pr-8 md:pr-16 flex flex-col justify-center relative z-10">
              <h1
                className="scanline-title mb-6 relative"
                style={{ 
                  fontSize: "clamp(4rem, 9vw, 6.5rem)", 
                  whiteSpace: "nowrap",
                  zIndex: 50,
                  width: "200%" 
                }}
              >
                MASTER DEFI<br />FARMING
              </h1>
              <p
                className="text-lg mb-12"
                style={{ color: "var(--color-text-muted)", maxWidth: "600px" }}
              >
                Stake assets, earn RWD tokens, and watch your portfolio grow
                with institutional-grade security.
              </p>

              <Link
                to="/dashboard"
                className="neo-btn px-8 py-3.5 text-sm font-semibold w-fit inline-block text-center"
                style={{ borderRadius: "6px", textDecoration: "none" }}
              >
                Connect Wallet
              </Link>
            </div>

            {/* Right: Shader placeholder */}
            <div
              className="hidden md:flex items-center justify-center"
              style={{
                background: "var(--color-surface-high)",
                borderLeft: "1px solid var(--color-surface-border)",
                minHeight: "420px",
              }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-widest select-none"
                style={{
                  color: "var(--color-surface-border)",
                  letterSpacing: "0.15em",
                }}
              >
                Shader
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features: Full VH ── */}
      <section
        ref={setRef(1)}
        className="scroll-entry stagger-1 min-h-screen flex items-center"
        style={{ padding: "0 clamp(1.5rem, 4vw, 3rem)" }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          <h2
            className="scanline-title mb-16"
            style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}
          >
            Built for real staking
          </h2>

          <div className="flex flex-col gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="feature-card p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-surface-border)",
                  borderRadius: "12px",
                }}
              >
                <h3
                  className="text-xl md:text-2xl font-semibold w-full md:w-1/3"
                  style={{
                    color: "#000000",
                    lineHeight: 1.25,
                  }}
                >
                  {feat.title}
                </h3>
                <p
                  className="text-sm md:text-base leading-relaxed w-full md:w-2/3"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
