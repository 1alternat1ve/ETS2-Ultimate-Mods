import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Map, Truck, Package, Music, Sparkles, Zap, Layers } from "lucide-react";
import { realTauri, type ModGroups, type ModEntry } from "../api/tauri";
import { useSettings } from "../store/useSettings";
import { formatBytes } from "../lib/format";

const GROUPS: { key: keyof ModGroups; label: string; Icon: typeof Map; color: string }[] = [
  { key: "maps", label: "Карты", Icon: Map, color: "var(--accent)" },
  { key: "trucks", label: "Грузовики", Icon: Truck, color: "var(--accent)" },
  { key: "trailers", label: "Прицепы", Icon: Package, color: "var(--info)" },
  { key: "sound", label: "Звук", Icon: Music, color: "var(--success)" },
  { key: "graphics", label: "Графика", Icon: Sparkles, color: "var(--warn)" },
  { key: "physics", label: "Физика", Icon: Zap, color: "var(--danger)" },
  { key: "other", label: "Прочее", Icon: Layers, color: "var(--text-muted)" },
];

const springTrans = { type: "spring" as const, stiffness: 200, damping: 20 };

export function ModsPage() {
  const settings = useSettings();
  const [groups, setGroups] = useState<ModGroups | null>(null);
  const [active, setActive] = useState<keyof ModGroups>("maps");

  useEffect(() => {
    const path = settings.data?.mods_path;
    if (!path) return;
    realTauri.scan_mods(path).then(setGroups).catch(() => setGroups(null));
  }, [settings.data?.mods_path]);

  function toggle(g: keyof ModGroups, mod: ModEntry) {
    if (!groups) return;
    const next = { ...groups, [g]: groups[g].map((m) => m.name === mod.name ? { ...m, enabled: !m.enabled } : m) };
    setGroups(next);
    realTauri.toggle_mod(mod.path, !mod.enabled);
  }

  const list = groups?.[active] ?? [];
  const maxSize = list.length > 0 ? Math.max(...list.map((m) => m.size_mb)) : 1;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1200 }}>
      <motion.header
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ marginBottom: 24 }}
      >
        <div className="tag" style={{ marginBottom: 10, fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em" }}>
          Моды
        </div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
          Мои моды
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
          Управление модами на диске. Безопасно: переименование <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>.scs</span> / <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>.scs.off</span>, профиль не трогается.
        </p>
      </motion.header>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        {/* Category sidebar */}
        <nav>
          {GROUPS.map((g, idx) => {
            const count = groups?.[g.key]?.length ?? 0;
            const enabled = groups?.[g.key]?.filter((m) => m.enabled).length ?? 0;
            const isActive = active === g.key;
            return (
              <motion.button
                key={g.key}
                onClick={() => setActive(g.key)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ x: 2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 14px",
                  borderRadius: 12,
                  background: isActive ? "rgba(45,212,191,0.10)" : "rgba(20, 29, 53, 0.4)",
                  backdropFilter: "blur(16px)",
                  border: `1px solid ${isActive ? "rgba(45,212,191,0.25)" : "rgba(255,255,255,0.05)"}`,
                  borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  marginBottom: 4,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <g.Icon size={15} color={isActive ? "var(--accent)" : g.color} />
                <span style={{ flex: 1 }}>{g.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: isActive ? "var(--accent-hover)" : "var(--text-dim)", opacity: isActive ? 0.9 : 1 }}>
                  {enabled}/{count}
                </span>
              </motion.button>
            );
          })}
        </nav>

        {/* Mod list */}
        <div>
          {!groups && (
            <div className="shimmer" style={{ height: 60, marginBottom: 8, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }} />
          )}
          {list.length === 0 && groups && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springTrans}
              style={{
                padding: 40,
                background: "rgba(20, 29, 53, 0.6)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                textAlign: "center",
                color: "var(--text-muted)",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.22)",
              }}
            >
              В этой категории модов нет.
            </motion.div>
          )}
          {list.map((mod, i) => (
            <ModItem
              key={mod.name}
              mod={mod}
              index={i}
              maxSize={maxSize}
              onToggle={() => toggle(active, mod)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModItem({
  mod,
  index,
  maxSize,
  onToggle,
}: {
  mod: ModEntry;
  index: number;
  maxSize: number;
  onToggle: () => void;
}) {
  const [pulse, setPulse] = useState(false);

  function handleToggle() {
    setPulse(true);
    setTimeout(() => setPulse(false), 500);
    onToggle();
  }

  // Relative size ratio 0..1
  const ratio = maxSize > 0 ? mod.size_mb / maxSize : 0;

  // Bar color: accent for small, gradient toward warn for large
  const barColor = ratio > 0.6 ? "var(--warn)" : "var(--accent)";
  const barGlow = ratio > 0.6 ? "rgba(251,191,36,0.25)" : "rgba(45,212,191,0.20)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, ...springTrans }}
      whileHover={{ y: -2, scale: 1.005 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "rgba(20, 29, 53, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${mod.enabled ? "rgba(45,212,191,0.18)" : "rgba(255, 255, 255, 0.08)"}`,
        borderRadius: 14,
        marginBottom: 8,
        transition: "background 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: mod.enabled ? "var(--text-main)" : "var(--text-dim)",
        }}>
          {mod.name}
        </div>

        {/* Size info row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>
            {formatBytes(mod.size_mb * 1024 * 1024)}
          </div>

          {/* Size bar */}
          <div style={{
            flex: 1,
            height: 4,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 2,
            overflow: "hidden",
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ratio * 100}%` }}
              transition={{ delay: index * 0.04 + 0.1, type: "spring", stiffness: 200, damping: 20 }}
              style={{
                height: "100%",
                borderRadius: 2,
                background: ratio > 0.6
                  ? "linear-gradient(90deg, var(--accent), var(--warn))"
                  : barColor,
                boxShadow: `0 0 6px ${barGlow}`,
              }}
            />
          </div>
        </div>
      </div>
      <motion.button
        onClick={handleToggle}
        title={mod.enabled ? "отключить" : "включить"}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.90 }}
        animate={pulse ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          width: 48,
          height: 26,
          borderRadius: 13,
          border: `1.5px solid ${mod.enabled ? "var(--success)" : "var(--text-dim)"}`,
          background: mod.enabled ? "rgba(52,211,153,0.12)" : "rgba(74,85,104,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: mod.enabled ? "flex-end" : "flex-start",
          padding: 3,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <motion.div
          layout
          transition={springTrans}
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: mod.enabled ? "var(--success)" : "var(--text-dim)",
            boxShadow: mod.enabled ? "0 0 10px rgba(52, 211, 153, 0.40)" : "none",
            transition: "box-shadow 0.2s",
          }}
        />
      </motion.button>
    </motion.div>
  );
}
