import { useEffect, useState, useCallback, useRef } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { Download, Play, ShieldCheck, Sparkles, Users, Cpu, HardDrive, Gauge, BookOpen, AlertTriangle, Wifi, Radio } from "lucide-react";
import { HeroAmbient } from "../components/HeroAmbient";
import { useCountUp } from "../lib/useCountUp";
import { formatBytes, formatNumber } from "../lib/format";
import { realTauri } from "../api/tauri";
import { useSettings } from "../context/SettingsContext";
import type { HardwareInfo, GitHubRelease, GamePath, WargmServerStatus } from "../api/tauri";
import type { Section } from "../App";
import { useToast } from "../components/Toast";
import { useI18n } from "../context/I18nContext";
import { UpdateBanner } from "../components/UpdateBanner";

const TILT_MAX = 5;

function useMagnetic() {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 150, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 150, damping: 20 });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rawX.set(((e.clientX - cx) / (rect.width / 2)) * TILT_MAX);
    rawY.set((-(e.clientY - cy) / (rect.height / 2)) * TILT_MAX);
  }, [rawX, rawY]);

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return { springX, springY, onMouseMove, onMouseLeave };
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
  grav: number;
}

function SparkleCanvas({ origin }: { origin: { x: number; y: number } | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Sparkle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!origin) return;
    const COLORS = ["#2dd4bf", "#5eead4", "#ffffff", "#34d399", "#a78bfa", "#fbbf24"];
    const sparks: Sparkle[] = [];
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      sparks.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1,
        decay: 0.022 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        grav: 0.06 + Math.random() * 0.04,
      });
    }
    sparksRef.current = sparks;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cv = canvas;
    const cx = ctx;

    let start: number | null = null;
    function tick(ts: number) {
      if (!start) start = ts;
      const dt = Math.min((ts - start) / 16.67, 3);
      start = ts;

      cx.clearRect(0, 0, cv.width, cv.height);

      sparksRef.current = sparksRef.current
        .map((s) => ({
          ...s,
          x: s.x + s.vx * dt,
          y: s.y + s.vy * dt,
          vy: s.vy + s.grav * dt,
          vx: s.vx * (1 - 0.015 * dt),
          life: s.life - s.decay * dt,
        }))
        .filter((s) => s.life > 0);

      for (const s of sparksRef.current) {
        cx.save();
        cx.globalAlpha = Math.max(0, s.life);
        cx.shadowBlur = s.size * 4;
        cx.shadowColor = s.color;
        cx.fillStyle = s.color;
        cx.beginPath();
        cx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
        cx.fill();
        cx.restore();
      }

      if (sparksRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [origin]);

  if (!origin) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9998,
      }}
    />
  );
}

interface QuickStat {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
}

function useQuickStats(modsPath: string, paths: GamePath[], settingsData: ReturnType<typeof useSettings>["data"], gameStartTime: number | null, t: (key: string) => string) {
  const [stats, setStats] = useState<QuickStat[]>([
    { label: t("modSize"), value: 0, suffix: " ГБ", icon: <HardDrive size={14} /> },
    { label: t("profiles"), value: 0, icon: <Users size={14} /> },
    { label: t("playTime"), value: 0, suffix: " мин", icon: <Sparkles size={14} /> },
  ]);
  const [uptime, setUptime] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (gameStartTime) {
      startRef.current = gameStartTime;
      setUptime(0);
    }
  }, [gameStartTime]);

  useEffect(() => {
    const id = setInterval(() => {
      if (startRef.current !== null) {
        setUptime(Math.floor((Date.now() - startRef.current) / 60000));
      }
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const scanMods = (path: string) => {
      realTauri.scan_mods(path).then((groups) => {
        if (!groups) return;
        const totalMb = Object.values(groups).flat().reduce((s, m) => s + m.size_mb, 0);
        const totalGb = Math.round(totalMb / 1024 * 10) / 10;
        setStats((prev) => prev.map((s) =>
          s.label === "Размер модов" ? { ...s, value: totalGb } : s
        ));
      }).catch(() => {});
    };

    if (modsPath) {
      scanMods(modsPath);
    } else if (paths[0]?.path) {
      const fallback = paths[0].path.replace(/\\[^\\]+$/, "\\mod");
      scanMods(fallback);
    } else {
      realTauri.get_mods_path().then((mp) => {
        if (mp) scanMods(mp);
      }).catch(() => {});
    }
  }, [modsPath, paths]);

  useEffect(() => {
    const profilesPath = settingsData?.profile_path
      || (paths[0]?.path
        ? paths[0].path.replace(/\\Euro Truck Simulator 2\\.*/, "\\Euro Truck Simulator 2\\profiles")
        : "");
    if (!profilesPath) return;
    realTauri.list_profiles(profilesPath).then((profiles) => {
      setStats((prev) =>
        prev.map((s) =>
          s.label === "Профили" ? { ...s, value: profiles.length } : s
        )
      );
    }).catch(() => {});
  }, [settingsData, paths]);

  return { stats, uptime };
}

function StatItem({ stat, index }: { stat: QuickStat; index: number }) {
  const animVal = useCountUp(stat.value, 1200 + index * 200);
  const [flash, setFlash] = useState(false);
  const prevVal = useRef(stat.value);

  useEffect(() => {
    if (stat.value !== prevVal.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 500);
      prevVal.current = stat.value;
      return () => clearTimeout(t);
    }
  }, [stat.value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.05, y: -2 }}
      style={{ textAlign: "center", cursor: "default" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: "var(--accent)",
          marginBottom: 4,
        }}
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "flex" }}
        >
          {stat.icon}
        </motion.div>
      </div>
      <motion.div
        key={stat.value}
        animate={flash
          ? { scale: [1, 1.12, 1], color: ["var(--accent)", "#5eead4"] }
          : { scale: 1, color: "var(--accent)" }
        }
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="mono"
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: "var(--accent)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          textShadow: flash ? "0 0 16px rgba(45,212,191,0.6)" : "0 0 12px rgba(45,212,191,0.2)",
        }}
      >
        {Math.round(animVal * 10) / 10}{stat.suffix ?? ""}
      </motion.div>
      <div
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
          marginTop: 3,
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
        }}
      >
        {stat.label}
      </div>
    </motion.div>
  );
}

function QuickStats({ modsPath, paths, settingsData, gameStartTime, t }: { modsPath: string; paths: GamePath[]; settingsData: ReturnType<typeof useSettings>["data"]; gameStartTime: number | null; t: (key: string) => string }) {
  const { stats, uptime } = useQuickStats(modsPath, paths, settingsData, gameStartTime, t);
  const displayStats = stats.map((s) => {
    if (s.label === t("playTime")) return { ...s, value: uptime };
    return s;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
      whileHover={{ scale: 1.01 }}
      className="glass-card"
      style={{
        borderLeft: "3px solid var(--accent)",
        padding: "18px 22px",
        transition: "box-shadow 0.25s ease",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {displayStats.map((s, i) => (
          <StatItem key={s.label} stat={s} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

export function HomePage({ goto, onStartInstall, onGotoFaq, gameStartTime }: { goto: (s: Section) => void; onStartInstall: () => void; onGotoFaq: () => void; gameStartTime: number | null }) {
  const settings = useSettings();
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [downloads, setDownloads] = useState(0);
  const [activations, setActivations] = useState(0);
  const [hw, setHw] = useState<HardwareInfo | null>(null);
  const [paths, setPaths] = useState<GamePath[]>([]);
  const [freeSpace, setFreeSpace] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [wargmStatus, setWargmStatus] = useState<WargmServerStatus | null>(null);
  const [wargmLoading, setWargmLoading] = useState(false);
  const [sparkleOrigin, setSparkleOrigin] = useState<{ x: number; y: number } | null>(null);
  const [versionWarningOpen, setVersionWarningOpen] = useState(false);
  const [versionWarningShown, setVersionWarningShown] = useState(false);
  const [installWarningOpen, setInstallWarningOpen] = useState(false);
  const toast = useToast();
  const t = useI18n();

  const REQUIRED_VERSION = "1.59.1.3";
  const getUserId = () => {
    let id = localStorage.getItem("nexus_uid");
    if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem("nexus_uid", id); }
    return id;
  };
  const userId = getUserId();

  // Ping online every 30s
  useEffect(() => {
    realTauri.pingOnline(userId);
    const interval = setInterval(() => realTauri.pingOnline(userId), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Poll online count every 30s
  useEffect(() => {
    realTauri.fetchOnlineUsers().then(setOnlineUsers).catch(() => {});
    const interval = setInterval(() => realTauri.fetchOnlineUsers().then(setOnlineUsers).catch(() => {}), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Poll Wargm server status every 5 minutes
  useEffect(() => {
    const fetchWargm = () => {
      setWargmLoading(true);
      realTauri.fetch_wargm_server_status()
        .then(setWargmStatus)
        .catch(() => setWargmStatus(null))
        .finally(() => setWargmLoading(false));
    };
    fetchWargm();
    const interval = setInterval(fetchWargm, 5 * 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const s = settings.data;
    if (!s) return;

    const owner = s.github_owner || "1alternat1ve";
    const repo = s.github_repo || "ETS2-Ultimate-Mods";
    const tag = s.github_tag || "tranzit";

    realTauri.fetch_release(owner, repo, tag, s.github_token || undefined)
      .then((r) => { setRelease(r); setHeroLoaded(true); })
      .catch((e) => { console.error("Ошибка загрузки Hero:", e); setHeroLoaded(true); });

    realTauri.fetch_total_downloads(owner, repo, "launcher", s.github_token || undefined).then(setDownloads).catch(console.error);
    realTauri.fetch_backend_stats().then((stats) => setActivations(stats.total_activations)).catch(console.error);
    realTauri.detect_hardware().then(setHw).catch(console.error);
    realTauri.find_all_game_paths().then((p) => {
      setPaths(p);
      if (p.length > 0 && p[0].version !== REQUIRED_VERSION && !versionWarningShown) {
        setVersionWarningOpen(true);
      }
      realTauri.get_free_space(p[0]?.path ?? s.game_path ?? "").then(setFreeSpace).catch(console.error);
    }).catch(console.error);
  }, [settings.data, versionWarningShown]);

  // Poll downloads every 30s
  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    const owner = s.github_owner || "1alternat1ve";
    const repo = s.github_repo || "ETS2-Ultimate-Mods";
    const tag = s.github_tag || "tranzit";
    const interval = setInterval(() => {
      realTauri.fetch_total_downloads(owner, repo, "launcher", s.github_token || undefined).then(setDownloads).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [settings.data]);

  const gameVersionWrong = paths.length > 0 && paths[0].version !== REQUIRED_VERSION;

  const totalSize = release ? release.assets.reduce((acc, a) => acc + a.size, 0) : 1024 * 1024 * 1024 * 50;
  const animDownloads = useCountUp(downloads || 0, 1400);
  const animActivations = useCountUp(activations || 0, 1400);

  function handleLaunchClick(e: React.MouseEvent) {
    setSparkleOrigin({ x: e.clientX, y: e.clientY });
    setTimeout(() => setSparkleOrigin(null), 2000);

    const gamePath = settings.data?.game_path;
    if (!gamePath) {
      toast.push(t("noGamePath"), { variant: "error", duration: 5000 });
      return;
    }

    toast.push(t("launchingGame"), { variant: "info" });
    realTauri.launch_game(gamePath)
      .then(() => {
        toast.push(t("gameLaunched"), { variant: "success", duration: 3000 });
      })
      .catch((err: unknown) => {
        toast.push(`${t("launchError")} ${String(err)}`, { variant: "error", duration: 6000 });
      });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative", padding: 28 }}>
      <SparkleCanvas origin={sparkleOrigin} />

      <AnimatePresence>
        {versionWarningOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.65)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)"
            }}
            onClick={() => { setVersionWarningOpen(false); setVersionWarningShown(true); }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{
                padding: "32px 36px",
                maxWidth: 440,
                width: "90%",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: "rgba(251, 191, 36, 0.12)",
                    border: "1px solid rgba(251, 191, 36, 0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                    boxShadow: "0 0 30px rgba(251,191,36,0.15)",
                  }}
                >
                  <Gauge size={28} color="var(--warn)" />
                </motion.div>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--warn)" }}>
                  {t("versionMismatch")}
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {t("versionMismatchBody")} <strong style={{ color: "var(--text-main)" }}>{paths[0]?.version ?? "—"}</strong>,
                  {t("versionMismatchNeed")} <strong className="text-shimmer" style={{ fontWeight: 700 }}>{REQUIRED_VERSION}</strong>.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <motion.button
                  className="btn btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => { setVersionWarningOpen(false); setVersionWarningShown(true); onGotoFaq(); }}
                >
                  {t("howChangeVersion")}
                </motion.button>
                <motion.button
                  className="btn btn-ghost"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => { setVersionWarningOpen(false); setVersionWarningShown(true); }}
                >
                  {t("later")}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Предупреждение перед установкой при неправильной версии */}
      <AnimatePresence>
        {installWarningOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.65)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)"
            }}
            onClick={() => setInstallWarningOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "rgba(15, 22, 41, 0.95)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                borderRadius: 20,
                padding: "32px 36px",
                maxWidth: 440,
                width: "90%",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(251,191,36,0.10)",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: "rgba(251, 191, 36, 0.12)",
                    border: "1px solid rgba(251, 191, 36, 0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                    boxShadow: "0 0 30px rgba(251,191,36,0.15)",
                  }}
                >
                  <AlertTriangle size={28} color="var(--warn)" />
                </motion.div>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--warn)" }}>
                  Версия игры не совпадает
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Версия игры: <strong style={{ color: "var(--text-main)" }}>{paths[0]?.version ?? "—"}</strong>,
                  требуется: <strong style={{ color: "var(--accent)" }}>{REQUIRED_VERSION}</strong>.<br />
                  При установке сборки игра может не запуститься.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <motion.button
                  className="btn btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => { setInstallWarningOpen(false); onGotoFaq(); }}
                >
                  <BookOpen size={14} />
                  Открыть базу знаний
                </motion.button>
                <motion.button
                  className="btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: "100%", justifyContent: "center",
                    background: "rgba(251, 113, 133, 0.12)",
                    border: "1px solid rgba(251, 113, 133, 0.3)",
                    color: "var(--danger)",
                    fontWeight: 600,
                  }}
                  onClick={() => { setInstallWarningOpen(false); onStartInstall(); }}
                >
                  <AlertTriangle size={14} />
                  Все равно начать установку
                </motion.button>
                <motion.button
                  className="btn btn-ghost"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setInstallWarningOpen(false)}
                >
                  Отмена
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero section */}
      <motion.section
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        whileHover={{
          scale: 1.003,
          y: -1,
          boxShadow: "0 16px 56px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 56px rgba(45, 212, 191, 0.10)"
        }}
        className="glass-card-heavy"
        style={{
          position: "relative",
          padding: "40px 36px 36px",
          overflow: "hidden",
          cursor: "default",
        }}
      >
        <HeroAmbient height={340} />

        {/* Ambient decorative orbs */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "-20px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(45, 212, 191, 0.12) 0%, transparent 70%)",
            pointerEvents: "none",
            filter: "blur(40px)",
            animation: "float-gentle 7s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30px",
            left: "30%",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(167, 139, 250, 0.08) 0%, transparent 70%)",
            pointerEvents: "none",
            filter: "blur(40px)",
            animation: "float-gentle 9s ease-in-out infinite reverse",
          }}
        />
        <div
          className="hero-shimmer"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
            borderRadius: "inherit",
          }}
        />

        {/* Animated corner accents */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 60,
            height: 60,
            borderTop: "2px solid rgba(45,212,191,0.3)",
            borderLeft: "2px solid rgba(45,212,191,0.3)",
            borderRadius: "16px 0 0 0",
            pointerEvents: "none",
          }}
        />
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 60,
            height: 60,
            borderBottom: "2px solid rgba(45,212,191,0.3)",
            borderRight: "2px solid rgba(45,212,191,0.3)",
            borderRadius: "0 0 16px 0",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32 }}>
          {/* Left: title, buttons, badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
          {release === null && !heroLoaded ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="shimmer"
                style={{ height: 24, width: 200, borderRadius: 20, border: "1px solid rgba(255,255,255,0.05)", marginBottom: 16 }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="shimmer"
                style={{ height: 56, width: "80%", borderRadius: 12, marginBottom: 12, border: "1px solid rgba(255,255,255,0.05)" }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="shimmer"
                style={{ height: 20, width: "60%", borderRadius: 8, marginBottom: 4, border: "1px solid rgba(255,255,255,0.05)" }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="shimmer"
                style={{ height: 20, width: "45%", borderRadius: 8, marginBottom: 24, border: "1px solid rgba(255,255,255,0.05)" }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="shimmer"
                style={{ height: 44, width: 260, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}
              />
            </>
          ) : (
            <>
              {/* Version badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.03 }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 14px",
                  borderRadius: 20,
                  background: "rgba(45, 212, 191, 0.10)",
                  border: "1px solid rgba(45, 212, 191, 0.25)",
                  color: "var(--accent)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  marginBottom: 16,
                  boxShadow: "0 0 16px rgba(45,212,191,0.10)",
                }}
              >
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }}
                />
                <Sparkles size={12} />
                <span className="mono" style={{ fontWeight: 700 }}>{release?.name ?? "NEXUS MEGA Build"}</span>
              </motion.div>

              {/* Main heading with gradient text */}
              <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05, color: "var(--text-main)" }}>
                {t("installHero")}
                <br />
                <span
                  className="text-gradient-animated"
                  style={{
                    background: "linear-gradient(135deg, #2dd4bf, #5eead4, #2dd4bf)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {t("installHeroSub")}
                </span>
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 540, marginTop: 12, lineHeight: 1.6 }}>
              </p>
            </>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            <motion.button
              className="btn btn-primary"
              onClick={() => {
                if (gameVersionWrong) {
                  setInstallWarningOpen(true);
                } else {
                  onStartInstall();
                }
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{ padding: "12px 22px", fontSize: 14 }}
            >
              <motion.span
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ display: "inline-flex" }}
              >
                <Download size={16} />
              </motion.span>
              {t("install")}
              <span style={{ fontFamily: "var(--font-mono)", opacity: 0.5, marginLeft: 6, fontSize: 13, position: "relative", top: 1 }}>
                50 GB
              </span>
            </motion.button>
            <motion.button
              className="btn btn-ghost"
              onClick={handleLaunchClick}
              whileHover={{ scale: 1.03, color: "var(--accent)" }}
              whileTap={{ scale: 0.97 }}
              style={{ padding: "12px 22px", fontSize: 14, borderColor: "var(--border-bright)" }}
            >
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ display: "inline-flex" }}
              >
                <Play size={16} />
              </motion.span>
              {t("launch")}
            </motion.button>
          </div>

          {/* Pill badges */}
          <div style={{ display: "flex", gap: 22, marginTop: 26, fontSize: 12, color: "var(--text-muted)" }}>
            <Pill icon={<Users size={12} />} label={`${formatNumber(Math.floor(animDownloads))} ${t("pillInstalls")}`} />
            <Pill icon={<ShieldCheck size={12} />} label={`${formatNumber(Math.floor(animActivations))} ${t("pillActivations")}`} />
            <Pill icon={<Wifi size={12} />} label={`${onlineUsers} ${t("pillOnline")}`} />
            <Pill icon={<ShieldCheck size={12} />} label={t("pillVerified")} />
            <Pill icon={<Sparkles size={12} />} label={t("pillBackup")} />
          </div>
          </div>

          {/* Right: Wargm server widget */}
          <WargmServerWidget
            status={wargmStatus}
            loading={wargmLoading}
            gamePath={settings.data?.game_path ?? ""}
            onConnect={() => {
              realTauri.launch_game(settings.data?.game_path ?? "", ["-connect=92.118.11.117", "-port=28197"])
                .catch((err: unknown) => toast.push(`${t("launchError")} ${String(err)}`, { variant: "error", duration: 6000 }));
            }}
          />
        </div>
      </motion.section>

      {/* Средний ряд карточек — привязан к баннеру сверху */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 24 }}>
        <InfoCard
          index={0}
          icon={<Cpu size={16} />}
          title={t("hardware")}
          tier={hw?.tier}
          rows={hw ? [
            ["CPU", hw.cpu.name],
            ["GPU", `${hw.gpu.name} · ${hw.gpu.vram_mb} МБ`],
            ["RAM", `${hw.ram_gb} ГБ`],
          ] : []}
        />
        <InfoCard
          index={1}
          icon={<Gauge size={16} />}
          title={t("game")}
          rows={paths.length > 0 ? [
            [t("type"), paths[0].type],
            [t("version"), paths[0].version],
          ] : [[t("status"), t("notFound")]]}
          warning={
            paths.length > 0 && paths[0].version !== REQUIRED_VERSION
              ? `${t("required")} ${REQUIRED_VERSION}`
              : undefined
          }
        />
        {paths.length > 0 && paths[0].version !== REQUIRED_VERSION && (
          <motion.button
            className="btn btn-ghost"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{ padding: "6px 14px", fontSize: 12, marginTop: 4 }}
            onClick={onGotoFaq}
          >
            {t("howChangeVersion")}
          </motion.button>
        )}
        <InfoCard
          index={2}
          icon={<HardDrive size={16} />}
          title={t("disk")}
          rows={[
            [t("freeSpace"), `${freeSpace > 0 ? freeSpace : "—"} ГБ`],
            [t("required"), `60 ${t("diskSpaceNote")}`],
          ]}
        />
      </div>

      {/* Панель статистики — прижата к низу */}
      <div style={{ marginTop: "auto" }}>
        <QuickStats modsPath={settings.data?.mods_path ?? ""} paths={paths} settingsData={settings.data} gameStartTime={gameStartTime} t={t} />

        <UpdateBanner />
      </div>
    </div>
  );
}

function WargmServerWidget({ status, loading, gamePath, onConnect }: { status: WargmServerStatus | null; loading: boolean; gamePath: string; onConnect: () => void }) {
  const isOnline = status && status.online > 0 && !status.hasError;
  const isServerUp = status && !status.hasError;
  const onlinePercent = status && status.maxOnline > 0 && !status.hasError
    ? Math.round((status.online / status.maxOnline) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
      style={{ flexShrink: 0, width: 320 }}
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        style={{
          padding: 22,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          cursor: "default",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Header: icon + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.div
            animate={isOnline ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 2, repeat: isOnline ? Infinity : 0 }}
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: isServerUp ? "rgba(45, 212, 191, 0.10)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isServerUp ? "rgba(45, 212, 191, 0.20)" : "rgba(255,255,255,0.06)"}`,
              color: isServerUp ? "var(--accent)" : "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Radio size={16} />
          </motion.div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {status?.server_name || "Eurasian Transit by Blite"}
              </span>
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(45,212,191,0.3)", borderTopColor: "var(--accent)", flexShrink: 0 }}
                />
              ) : (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: status?.hasError ? "var(--warn)" : isOnline ? "var(--success)" : "var(--text-muted)",
                    boxShadow: isOnline ? "0 0 6px var(--success)" : "none",
                  }}
                />
              )}
            </div>
            <div
              onClick={() => navigator.clipboard?.writeText("90286389179523078/101")}
              style={{ fontSize: 14, color: "var(--accent)", marginTop: 5, fontFamily: "var(--font-mono)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, fontWeight: 600 }}
              title="Нажми чтобы скопировать"
            >
              90286389179523078/101
            </div>
          </div>
        </div>

        {/* Online info or error */}
        {status && !loading && (
          status.hasError ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.14)",
              borderRadius: 8,
              fontSize: 12, color: "var(--warn)",
            }}>
              <AlertTriangle size={12} />
              {status.errorMsg === "vpn" ? "Выключи VPN" : "Ошибка"}
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Онлайн</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                  {status.online} / {status.maxOnline}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(onlinePercent, 100)}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  style={{
                    height: "100%", borderRadius: 3,
                    background: onlinePercent > 80
                      ? "linear-gradient(90deg, var(--warn), #f97316)"
                      : onlinePercent > 50
                        ? "linear-gradient(90deg, var(--accent), #5eead4)"
                        : "linear-gradient(90deg, var(--success), var(--accent))",
                  }}
                />
              </div>
            </div>
          )
        )}

        {!status && !loading && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
            Загрузка...
          </div>
        )}

        {/* Connect button removed */}
      </motion.div>
    </motion.div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        transition: "border-color 0.2s",
      }}
    >
      <span style={{ color: "var(--accent)" }}>{icon}</span>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
    </motion.div>
  );
}

function AssetCard({ asset, index }: { asset: { name: string; size: number }; index: number }) {
  const { springX, springY, onMouseMove, onMouseLeave } = useMagnetic();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.06, type: "spring", stiffness: 200, damping: 20 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ perspective: 800 }}
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        className="glass-card"
        style={{
          padding: 16,
          borderLeft: "3px solid var(--accent)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "default",
          rotateX: springY,
          rotateY: springX,
          transformStyle: "preserve-3d",
        }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(45, 212, 191, 0.10)",
            border: "1px solid rgba(45, 212, 191, 0.20)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {asset.name.endsWith(".7z") ? "7z" : asset.name.endsWith(".zip") ? "zip" : "scs"}
        </motion.div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-main)" }}>{asset.name}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{formatBytes(asset.size)}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoCard({
  icon, title, rows, warning, tier, index,
}: {
  icon: React.ReactNode;
  title: string;
  rows: [string, string][];
  warning?: string;
  tier?: string;
  index: number;
}) {
  const { springX, springY, onMouseMove, onMouseLeave } = useMagnetic();

  const tierColor: Record<string, string> = {
    low: "var(--danger)",
    mid: "var(--warn)",
    high: "var(--success)",
    ultra: "var(--accent)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.06, type: "spring", stiffness: 200, damping: 20 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ perspective: 800 }}
    >
      <motion.div
        whileHover={{ scale: 1.025, y: -3 }}
        className="glass-card"
        style={{
          padding: 18,
          borderLeft: "3px solid var(--accent)",
          rotateX: springY,
          rotateY: springX,
          transformStyle: "preserve-3d",
          cursor: "default",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ color: "var(--accent)", display: "flex" }}
          >
            {icon}
          </motion.div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)" }}>{title}</div>
          {tier && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              style={{
                padding: "3px 10px",
                borderRadius: 20,
                background: `${tierColor[tier]}18`,
                color: tierColor[tier],
                border: `1px solid ${tierColor[tier]}40`,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {tier}
            </motion.div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.length === 0 && Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.06 + 0.1 + i * 0.05 }}
              className="shimmer"
              style={{ height: 14, borderRadius: 4, border: "1px solid rgba(255,255,255,0.04)" }}
            />
          ))}
          {rows.map(([k, v]) => (
            <motion.div
              key={k}
              whileHover={{ x: 2 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}
            >
              <span style={{ color: "var(--text-dim)" }}>{k}</span>
              <span style={{ color: "var(--text-main)", fontFamily: "var(--font-mono)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v}>{v}</span>
            </motion.div>
          ))}
        </div>
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "var(--warn)",
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.20)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ShieldCheck size={11} />
            {warning}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
