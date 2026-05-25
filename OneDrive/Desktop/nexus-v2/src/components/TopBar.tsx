import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronRight, Search, Minus, Square, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Section } from "../App";
import { useSettings } from "../store/useSettings";
import { useMode } from "../context/ModeContext";
import { useI18n } from "../context/I18nContext";

const appWindow = getCurrentWindow();

const TITLES: Record<Section, string> = {
  home: "home",
  profiles: "profiles",
  graphics: "graphics",
  optimize: "optimize",
  tools: "tools",
  backups: "backups",
  logs: "logs",
  faq: "faq",
  settings: "settings",
};

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
  rot: number;
  rotV: number;
  char: string;
}

function GlitchLogo({ onDoubleClick }: { onDoubleClick: () => void }) {
  const [glitching, setGlitching] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastClickRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const CHARS = "!@#$%^&*<>?{}[]|\\".split("");

  const startGlitch = useCallback(() => {
    setGlitching(true);
    setShaking(true);
    setTimeout(() => { setGlitching(false); setShaking(false); }, 400);
  }, []);

  const explode = useCallback(() => {
    const el = logoRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const particles: Particle[] = [];
    const chars = "NEXUS".split("");
    chars.forEach((ch, i) => {
      for (let j = 0; j < 3; j++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4;
        particles.push({
          id: i * 10 + j,
          x: cx + (i - 2) * 14,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          size: 10 + Math.random() * 8,
          color: i % 2 === 0 ? "#2dd4bf" : "#5eead4",
          rot: Math.random() * 360,
          rotV: (Math.random() - 0.5) * 12,
          char: ch,
        });
      }
    });
    particlesRef.current = particles;
    setShowParticles(true);

    let start: number | null = null;
    function tick(ts: number) {
      if (!start) start = ts;
      const dt = (ts - start) / 16.67;
      start = ts;
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt + 0.15 * dt * dt,
          vy: p.vy + 0.08 * dt,
          life: p.life - 0.018 * dt,
          rot: p.rot + p.rotV * dt,
        }))
        .filter((p) => p.life > 0);

      if (particlesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setShowParticles(false);
      }
    }
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) {
      startGlitch();
      setTimeout(explode, 50);
    }
    lastClickRef.current = now;
  }, [startGlitch, explode]);

  const handleMouseEnter = useCallback(() => {
    startGlitch();
  }, [startGlitch]);

  const handleMouseLeave = useCallback(() => {
    setShaking(false);
    setGlitching(false);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative",
          cursor: "default",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {/* Glow on hover */}
        <motion.div
          animate={{ opacity: shaking ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "absolute",
            inset: "-6px -10px",
            borderRadius: 8,
            background: "radial-gradient(ellipse, rgba(45,212,191,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Red channel layer */}
        <AnimatePresence>
          {glitching && (
            <motion.div
              key="r"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: [0, -3, 2, -1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, times: [0, 0.2, 0.4, 0.7, 1] }}
              style={{
                position: "absolute",
                color: "rgba(255, 80, 80, 0.75)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                fontWeight: 900,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                clipPath: "inset(20% 0 60% 0)",
                zIndex: 3,
              }}
            >
              NEXUS
            </motion.div>
          )}
        </AnimatePresence>

        {/* Blue channel layer */}
        <AnimatePresence>
          {glitching && (
            <motion.div
              key="b"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: [0, 3, -2, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, times: [0, 0.2, 0.4, 0.7, 1] }}
              style={{
                position: "absolute",
                color: "rgba(80, 120, 255, 0.75)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                fontWeight: 900,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                clipPath: "inset(55% 0 15% 0)",
                zIndex: 3,
              }}
            >
              NEXUS
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main text */}
        <motion.span
          ref={logoRef}
          animate={
            shaking
              ? {
                  x: [0, 1.5, -1, 0.5, -0.5, 0],
                  textShadow: [
                    "0 0 0px var(--accent)",
                    "2px 0 8px rgba(255,80,80,0.6), -2px 0 8px rgba(80,120,255,0.6)",
                    "0 0 0px var(--accent)",
                  ],
                }
              : { x: 0, textShadow: "0 0 0px var(--accent)" }
          }
          transition={{ duration: 0.3, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            fontWeight: 900,
            color: "var(--accent)",
            position: "relative",
            zIndex: 2,
            userSelect: "none",
          }}
        >
          NEXUS
        </motion.span>
      </div>

      {/* Particle overlay — fixed positioned so it works regardless of DOM location */}
      <AnimatePresence>
        {showParticles && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            {particlesRef.current.map((p) => (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y,
                  fontFamily: "var(--font-mono)",
                  fontSize: p.size,
                  fontWeight: 900,
                  color: p.color,
                  opacity: Math.max(0, p.life),
                  transform: `rotate(${p.rot}deg)`,
                  transition: "opacity 0.05s",
                  textShadow: `0 0 ${p.size * 2}px ${p.color}`,
                }}
              >
                {p.char}
              </div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export function TopBar({
  section,
  onSearchClick,
}: {
  section: Section;
  onSearchClick: () => void;
}) {
  const settings = useSettings();
  const { isDemoMode, toggle } = useMode();
  const t = useI18n();
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        gridArea: "topbar",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-elev-1)",
        gap: 12,
        userSelect: "none",
        WebkitAppRegion: "drag",
        height: 52,
      } as React.CSSProperties}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
      >
        <GlitchLogo onDoubleClick={() => {}} />
        <ChevronRight size={11} color="var(--text-dim)" />
        <span style={{ color: "var(--text-main)", fontWeight: 600, fontSize: 12 }}>
          {t(TITLES[section])}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Demo/Live Mode toggle */}
      <button
        onClick={toggle}
        title={isDemoMode ? t("liveMode") : t("demoMode")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 10px",
          borderRadius: "var(--r-sm)",
          background: isDemoMode ? "rgba(251, 191, 36, 0.12)" : "rgba(16, 185, 129, 0.12)",
          border: `1px solid ${isDemoMode ? "rgba(251, 191, 36, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
          color: isDemoMode ? "#fbbf24" : "#10b981",
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
          transition: "all 0.2s ease",
        } as React.CSSProperties}
      >
        {isDemoMode ? "DEMO" : "LIVE"}
      </button>

      <button
        onClick={onSearchClick}
        style={
          {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            borderRadius: "var(--r-sm)",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: 11,
            cursor: "pointer",
            WebkitAppRegion: "no-drag",
            transition: "border-color 0.15s, color 0.15s",
          } as React.CSSProperties
        }
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)";
          e.currentTarget.style.color = "var(--text-main)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        <Search size={12} />
        <span>{t("search")}</span>
        <kbd
          style={{
            background: "var(--bg-elev-3)",
            padding: "1px 5px",
            borderRadius: 3,
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            color: "var(--text-dim)",
            border: "1px solid var(--border)",
            letterSpacing: "0.05em",
          }}
        >
          Ctrl K
        </kbd>
      </button>

      <span
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          minWidth: 68,
          textAlign: "right",
          letterSpacing: "0.05em",
        }}
      >
        {time.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>

      <div
        style={{ display: "flex", gap: 4, WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button className="btn-icon" onClick={() => appWindow.minimize()} title={t("minimize")}><Minus size={13} /></button>
        <button className="btn-icon" onClick={async () => { await appWindow.setFullscreen(!(await appWindow.isFullscreen())); }} title={t("toggleFullscreen")}><Square size={10} /></button>
        <button className="btn-icon" onClick={() => appWindow.close()} title={t("close")}><X size={13} /></button>
      </div>
    </header>
  );
}
