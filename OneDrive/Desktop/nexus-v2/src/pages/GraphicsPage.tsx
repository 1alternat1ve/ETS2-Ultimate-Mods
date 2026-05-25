import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Monitor, Terminal, Rocket, Zap, Save } from "lucide-react";
import { realTauri } from "../api/tauri";
import { useI18n } from "../context/I18nContext";

const glassBase = {
  background: "rgba(20, 29, 53, 0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
};

const hoverLiftEnter = {
  background: "rgba(20, 29, 53, 0.82)",
  borderColor: "rgba(255, 255, 255, 0.13)",
  boxShadow: "0 10px 36px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(255, 255, 255, 0.04) inset",
  y: -2,
};

const hoverLiftLeave = {
  background: "rgba(20, 29, 53, 0.6)",
  borderColor: "rgba(255, 255, 255, 0.08)",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.02) inset",
  y: 0,
};

const glassTransition = "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)";

export function GraphicsPage() {
  const t = useI18n();
  const [traffic, setTraffic] = useState(1.0);
  const [flySpeed, setFlySpeed] = useState(100);
  const [devMode, setDevMode] = useState(false);
  const [consoleOn, setConsoleOn] = useState(false);
  const [argNoIntro, setArgNoIntro] = useState(true);
  const [argUnlimitedLog, setArgUnlimitedLog] = useState(false);
  const [arg64bit, setArg64bit] = useState(false);
  const [customArgs, setCustomArgs] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    realTauri.read_game_config().then((cfg) => {
      if (cfg) {
        if (cfg.g_traffic) setTraffic(parseFloat(cfg.g_traffic));
        if (cfg.g_developer) setDevMode(cfg.g_developer === "1");
        if (cfg.g_console) setConsoleOn(cfg.g_console === "1");
        if (cfg.g_flyspeed) setFlySpeed(parseFloat(cfg.g_flyspeed));
      }
    }).catch(console.error);
  }, []);

  function handleSave() {
    const updates: Record<string, string> = {
      g_traffic: traffic.toFixed(1),
      g_developer: devMode ? "1" : "0",
      g_console: consoleOn ? "1" : "0",
      g_flyspeed: flySpeed.toFixed(0),
    };
    realTauri.save_game_config(updates)
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); })
      .catch(console.error);
  }

  function appendMemoryArgs() {
    if (!customArgs.includes("-mm_pool_size")) {
      setCustomArgs((prev) =>
        `${prev} -mm_pool_size 16384 -mm_max_resource_size 100 -mm_max_tmp_buffers_size 1000 -cpuLoadLimit 100`.trim()
      );
    }
  }

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      <motion.header
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ marginBottom: 28 }}
      >
        <div className="tag" style={{ marginBottom: 12, fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em" }}>
          {t("graphicsEngine")}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 8px", color: "var(--text-main)" }}>
          {t("graphicsTitle")}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
          {t("graphicsDesc")}
        </p>
      </motion.header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Генерация мира */}
        <SectionCard
          index={0}
          tint="#facc15"
          icon={<Monitor size={18} />}
          title={t("graphicsWorldGen")}
          subtitle={t("graphicsWorldGenWarn")}
        >
          <SliderRow
            label={t("graphicsTraffic")}
            value={traffic}
            min={0}
            max={10}
            step={0.5}
            onChange={setTraffic}
            tint="#facc15"
            format={(v) => v.toFixed(1)}
          />
        </SectionCard>

        {/* Отладка */}
        <SectionCard
          index={1}
          tint="var(--accent)"
          icon={<Terminal size={18} />}
          title={t("graphicsDebug")}
          subtitle={t("graphicsDevModeHint")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ToggleRow
              label={t("graphicsDevMode")}
              hint={t("graphicsFreecamHint")}
              checked={devMode}
              onChange={setDevMode}
            />
            <ToggleRow
              label={t("graphicsConsole")}
              hint={t("graphicsConsoleHint")}
              checked={consoleOn}
              onChange={setConsoleOn}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <SliderRow
              label={t("graphicsFlySpeed")}
              value={flySpeed}
              min={10}
              max={500}
              step={10}
              onChange={setFlySpeed}
              tint="var(--accent)"
              format={(v) => `${v}`}
            />
          </div>
        </SectionCard>

        {/* Аргументы запуска */}
        <SectionCard
          index={2}
          tint="var(--success)"
          icon={<Rocket size={18} />}
          title={t("graphicsLaunchArgs")}
          subtitle={t("graphicsLaunchArgsHint")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <ToggleRow label={t("graphicsNoIntro")} hint="-nointro" checked={argNoIntro} onChange={setArgNoIntro} />
            <ToggleRow label={t("graphicsUnlimitedLog")} hint="-unlimitedlog" checked={argUnlimitedLog} onChange={setArgUnlimitedLog} />
            <ToggleRow label={t("graphicsForce64")} hint="-64bit" checked={arg64bit} onChange={setArg64bit} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 8,
            }}>
              {t("graphicsCustomArgs")}
            </label>
            <input
              type="text"
              value={customArgs}
              onChange={(e) => setCustomArgs(e.target.value)}
              placeholder="-homedir C:\ETS2"
              spellCheck={false}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(20, 29, 53, 0.6)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-main)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(52, 211, 153, 0.40)";
                e.target.style.boxShadow = "0 0 0 3px rgba(52, 211, 153, 0.08)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.08)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <motion.button
              onClick={appendMemoryArgs}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 12,
                background: "rgba(20, 29, 53, 0.6)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-muted)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(45,212,191,0.30)";
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <Zap size={13} />
              {t("graphicsMemoryOpt")}
            </motion.button>
            <motion.button
              onClick={handleSave}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 18px",
                borderRadius: 12,
                background: saved ? "var(--success)" : "var(--accent)",
                border: "none",
                color: "#fff",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                marginLeft: "auto",
                transition: "background 0.3s, box-shadow 0.15s",
                boxShadow: saved ? "0 6px 18px rgba(52, 211, 153, 0.35)" : "0 4px 14px rgba(45, 212, 191, 0.30)",
              }}
            >
              <Save size={13} />
              {saved ? t("graphicsSaved") : t("save")}
            </motion.button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({
  index,
  tint,
  icon,
  title,
  subtitle,
  children,
}: {
  index: number;
  tint: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.01, y: -2 }}
      style={{
        ...glassBase,
        borderTop: `3px solid ${tint}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
          <motion.div
            whileHover={{ scale: 1.06 }}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: `${tint}18`,
              border: `1px solid ${tint}40`,
              color: tint,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 0 20px ${tint}15`,
              transition: "box-shadow 0.2s",
            }}
          >
            {icon}
          </motion.div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 5px", color: "var(--text-main)" }}>{title}</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
              {subtitle}
            </p>
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  tint,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  tint: string;
  format: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>{label}</label>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 800,
          color: tint,
          textShadow: `0 0 12px ${tint}60`,
        }}>
          {format(value)}
        </span>
      </div>
      <div style={{ position: "relative", height: 6 }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          height: 6,
          width: `${pct}%`,
          background: tint,
          borderRadius: 3,
          transition: "width 0.1s",
          boxShadow: `0 0 10px ${tint}50`,
        }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 6,
            appearance: "none",
            background: "transparent",
            outline: "none",
            cursor: "pointer",
            margin: 0,
          }}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderRadius: 12,
        background: checked ? "rgba(45, 212, 191, 0.08)" : "rgba(20, 29, 53, 0.4)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${checked ? "rgba(45, 212, 191, 0.30)" : "rgba(255, 255, 255, 0.06)"}`,
        transition: "all 0.2s",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? "var(--text-main)" : "var(--text-muted)" }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{hint}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: checked ? "var(--accent)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${checked ? "var(--accent)" : "rgba(255, 255, 255, 0.10)"}`,
          cursor: "pointer",
          position: "relative",
          transition: "all 0.2s",
          flexShrink: 0,
          padding: 0,
        }}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: checked ? "#fff" : "var(--text-dim)",
            position: "absolute",
            top: 2,
            left: checked ? undefined : 2,
            right: checked ? 2 : undefined,
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </motion.div>
  );
}
