import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { TokenShader } from "./TokenShader";

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



export function LandingPage({ children }: { children?: React.ReactNode }) {
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
                  width: "200%",
                  backgroundImage: "repeating-linear-gradient(0deg, #0f766e, #0f766e 3px, var(--color-bg) 3px, var(--color-bg) 4.5px)"
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

            {/* Right: 3D Token Shader */}
            <div
              className="hidden md:flex items-center justify-center relative"
              style={{
                width: "100%",
                height: "550px",
                transform: "translateY(-40px)",
              }}
            >
              <TokenShader />
            </div>
          </div>
        </div>
      </section>

      {children}
    </div>
  );
}
