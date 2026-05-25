import { useEffect, useState, useCallback, useRef } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { Download, Play, ShieldCheck, Sparkles, Users, Cpu, HardDrive, Gauge } from "lucide-react";
import { HeroAmbient } from "../components/HeroAmbient";
import { useCountUp } from "../lib/useCountUp";
import { formatBytes, formatNumber } from "../lib/format";
import { realTauri } from "../api/tauri";
import { useSettings } from "../store/useSettings";
import type { HardwareInfo, GitHubRelease, GamePath, ModGroups } from "../api/tauri";
import type { Section } from "../App";
import { useToast } from "../components/Toast";
import { useI18n } from "../context/I18nContext";

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

// --- SparkleCanvas: canvas particles on launch click ---
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

// --- Quick Stats Widget ---
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
          s.label === "Профилей" ? { ...s, value: profiles.length } : s
        )
      );
    }).catch(() => {});
  }, [settingsData, paths]);

  return { stats, uptime };
}

function StatItem({ stat, index }: { stat: QuickStat; index: number }) {
  const animVal = useCountUp(stat.value, 1200 + index * 200);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 200, damping: 20 }}
      style={{ textAlign: "center" }}
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
        {stat.icon}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: "var(--accent)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {Math.round(animVal * 10) / 10}{stat.suffix ?? ""}
      </div>
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
      style={{
        background: "rgba(20, 29, 53, 0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: 16,
        padding: "18px 22px",
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
  const [downloads, setDownloads] = useState(0);
  const [hw, setHw] = useState<HardwareInfo | null>(null);
  const [paths, setPaths] = useState<GamePath[]>([]);
  const [freeSpace, setFreeSpace] = useState(0);
  const [sparkleOrigin, setSparkleOrigin] = useState<{ x: number; y: number } | null>(null);
  const [versionWarningOpen, setVersionWarningOpen] = useState(false);
  const [versionWarningShown, setVersionWarningShown] = useState(false);
  const toast = useToast();
  const t = useI18n();

  const REQUIRED_VERSION = "1.58.1.4";

  useEffect(() => {
    const s = settings.data;
    if (!s) return;

    const owner = s.github_owner || "1alternat1ve";
    const repo = s.github_repo || "ETS2-Ultimate-Mods";
    const tag = s.github_tag || "mega";
    realTauri.fetch_release(owner, repo, tag, s.github_token || undefined).then(setRelease).catch(console.error);
    realTauri.fetch_total_downloads(owner, repo, tag, s.github_token || undefined).then(setDownloads).catch(console.error);
    realTauri.detect_hardware().then(setHw).catch(console.error);
    realTauri.find_all_game_paths().then((p) => {
      setPaths(p);
      if (p.length > 0 && p[0].version !== REQUIRED_VERSION && !versionWarningShown) {
        setVersionWarningOpen(true);
      }
      realTauri.get_free_space(p[0]?.path ?? s.game_path ?? "").then(setFreeSpace).catch(console.error);
    }).catch(console.error);
  }, [settings.data, versionWarningShown]);

  const totalSize = release ? release.assets.reduce((acc, a) => acc + a.size, 0) : 0;
  const animDownloads = useCountUp(downloads, 1400);

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
    <div style={{ position: "relative", padding: 28, maxWidth: 1280 }}>
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
              style={{
                background: "rgba(15, 20, 38, 0.95)",
                border: "1px solid rgba(251, 191, 36, 0.35)",
                borderRadius: 20,
                padding: "32px 36px",
                maxWidth: 440,
                width: "90%",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(251,191,36,0.1) inset",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "rgba(251, 191, 36, 0.12)",
                  border: "1px solid rgba(251, 191, 36, 0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px"
                }}>
                  <Gauge size={28} color="var(--warn)" />
                </div>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--warn)" }}>
                  {t("versionMismatch")}
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {t("versionMismatchBody")} <strong style={{ color: "var(--text-main)" }}>{paths[0]?.version ?? "—"}</strong>,
                  {t("versionMismatchNeed")} <strong style={{ color: "var(--accent)" }}>{REQUIRED_VERSION}</strong>.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => { setVersionWarningOpen(false); setVersionWarningShown(true); onGotoFaq(); }}
                >
                  {t("howChangeVersion")}
                </button>
                <button
                  className="btn"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => { setVersionWarningOpen(false); setVersionWarningShown(true); }}
                >
                  {t("later")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero - glass-morphism */}
      <motion.section
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        whileHover={{ scale: 1.003, y: -1 }}
        style={{ position: "relative", padding: "40px 36px 36px", borderRadius: 20, background: "rgba(20, 29, 53, 0.70)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.10)", overflow: "hidden", marginBottom: 24, boxShadow: "0 12px 48px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 48px rgba(45, 212, 191, 0.05)", cursor: "default" }}
      >
        <HeroAmbient height={340} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 20, background: "rgba(45, 212, 191, 0.10)", border: "1px solid rgba(45, 212, 191, 0.20)", color: "var(--accent)", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", marginBottom: 16 }}>
            <Sparkles size={12} /> {release?.tag_name?.toUpperCase() ?? "MEGA"} · v{release ? "1.58.1.4" : "—"}
          </div>
          <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05, color: "var(--text-main)" }}>
            {t("installHero")} <br />
            <span style={{ background: "linear-gradient(135deg, #2dd4bf, #5eead4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("installHeroSub")}
            </span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 540, marginTop: 12, lineHeight: 1.6 }}>
            {release?.body ?? "ProMods 2.71 · RusMap 2.50 · 87 проверенных модов. Готово к Convoy и Solo режимам."}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
            <button className="btn btn-primary" onClick={onStartInstall} style={{ padding: "12px 22px", fontSize: 14 }}>
              <Download size={16} /> {t("install")}
              <span style={{ fontFamily: "var(--font-mono)", opacity: 0.7, marginLeft: 6, fontSize: 11 }}>
                {formatBytes(totalSize)}
              </span>
            </button>
            <motion.button
              className="btn"
              onClick={handleLaunchClick}
              style={{ padding: "12px 22px", fontSize: 14 }}
              whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(45,212,191,0.25)" }}
              whileTap={{ scale: 0.97 }}
            >
              <Play size={16} /> {t("launch")}
            </motion.button>
          </div>

          <div style={{ display: "flex", gap: 22, marginTop: 26, fontSize: 12, color: "var(--text-muted)" }}>
            <Pill icon={<Users size={12} />} label={`${formatNumber(Math.floor(animDownloads))} ${t("pillInstalls")}`} />
            <Pill icon={<ShieldCheck size={12} />} label={t("pillVerified")} />
            <Pill icon={<Sparkles size={12} />} label={t("pillBackup")} />
          </div>
        </div>
      </motion.section>

      {/* System cards with stagger entrance + magnetic tilt */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 24 }}>
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
          <button
            className="btn"
            style={{ padding: "6px 14px", fontSize: 12, marginTop: 4 }}
            onClick={onGotoFaq}
          >
            {t("howChangeVersion")}
          </button>
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

      {/* Quick Stats */}
      <QuickStats modsPath={settings.data?.mods_path ?? ""} paths={paths} settingsData={settings.data} gameStartTime={gameStartTime} t={t} />
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20 }}>
      <span style={{ color: "var(--accent)" }}>{icon}</span> <span style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

function AssetCard({ asset, index }: { asset: { name: string; size: number }; index: number }) {
  const { springX, springY, onMouseMove, onMouseLeave } = useMagnetic();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200, damping: 20 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ perspective: 800 }}
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -2, backgroundColor: "rgba(20, 29, 53, 0.82)", borderColor: "rgba(255,255,255,0.14)", boxShadow: "0 10px 36px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(255, 255, 255, 0.04) inset" }}
        style={{
          padding: 16,
          background: "rgba(20, 29, 53, 0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "default",
          rotateX: springY,
          rotateY: springX,
          transformStyle: "preserve-3d",
          transition: "background 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.25s, box-shadow 0.25s",
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(45, 212, 191, 0.10)", border: "1px solid rgba(45, 212, 191, 0.20)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700 }}>
          {asset.name.endsWith(".7z") ? "7z" : asset.name.endsWith(".zip") ? "zip" : "scs"}
        </div>
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
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200, damping: 20 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ perspective: 800 }}
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -2, backgroundColor: "rgba(20, 29, 53, 0.82)", borderColor: "rgba(255,255,255,0.14)", boxShadow: "0 10px 36px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(255, 255, 255, 0.04) inset" }}
        style={{
          padding: 18,
          background: "rgba(20, 29, 53, 0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 16,
          rotateX: springY,
          rotateY: springX,
          transformStyle: "preserve-3d",
          cursor: "default",
          transition: "background 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.25s, box-shadow 0.25s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ color: "var(--accent)" }}>{icon}</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)" }}>{title}</div>
          {tier && (
            <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 20, background: `${tierColor[tier]}18`, color: tierColor[tier], border: `1px solid ${tierColor[tier]}40`, fontSize: 11, fontWeight: 600 }}>
              {tier}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.length === 0 && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer" style={{ height: 14, borderRadius: 4, border: "1px solid rgba(255,255,255,0.04)" }} />
          ))}
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--text-dim)" }}>{k}</span>
              <span style={{ color: "var(--text-main)", fontFamily: "var(--font-mono)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v}>{v}</span>
            </div>
          ))}
        </div>
        {warning && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 12, fontSize: 11, color: "var(--warn)", padding: "8px 12px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)", borderRadius: 10 }}>
            <ShieldCheck size={11} style={{ display: "inline", marginRight: 4 }} /> {warning}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
