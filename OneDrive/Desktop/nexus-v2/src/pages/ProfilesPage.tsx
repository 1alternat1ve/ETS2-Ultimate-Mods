import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Cloud, HardDrive, RefreshCw, ChevronRight } from "lucide-react";
import { realTauri, type ProfileInfo } from "../api/tauri";
import { useSettings } from "../store/useSettings";
import { formatMoney, formatNumber, formatRelativeDate } from "../lib/format";

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settings = useSettings();

  function refresh() {
    setLoading(true);
    setError(null);
    // Передаём пустую строку — Rust сам найдёт Documents + ETS2/profiles
    realTauri.list_profiles("")
      .then((p) => { setProfiles(p); setLoading(false); })
      .catch((e: unknown) => {
        setError(String(e));
        setProfiles([]);
        setLoading(false);
      });
  }
  useEffect(refresh, []);

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <motion.header
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ display: "flex", alignItems: "center", marginBottom: 24 }}
      >
        <div style={{ flex: 1 }}>
          <div className="tag" style={{ marginBottom: 10, fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em" }}>
            Профили
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
            Профили игроков
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
            Локальные сохранения и Steam Cloud. Выберите профиль, к которому применить mega-сборку.
          </p>
        </div>
        <motion.button
          className="btn"
          onClick={refresh}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.96 }}
          style={{ padding: "10px 16px", fontSize: 13 }}
        >
          <RefreshCw size={14} /> обновить
        </motion.button>
      </motion.header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 20 }}
                className="shimmer"
                style={{ height: 150, borderRadius: 18, border: "1px solid rgba(255,255,255,0.05)" }}
              />
            ))
          : profiles.map((p, i) => (
              <ProfileCard
                key={p.id}
                profile={p}
                index={i}
                selected={selected === p.id}
                onSelect={() => setSelected(p.id)}
              />
            ))}

        {!loading && (error || profiles.length === 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{
              padding: 40,
              background: "rgba(20, 29, 53, 0.6)",
              backdropFilter: "blur(20px)",
              border: error ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              textAlign: "center",
              color: "var(--text-muted)",
              gridColumn: "1 / -1",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.22)",
            }}
          >
            <User size={36} style={{ margin: "0 auto 14px", display: "block", color: error ? "#f87171" : "var(--text-dim)" }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: error ? "#f87171" : "var(--text-main)" }}>
              {error ? "Ошибка загрузки" : "Профили не найдены"}
            </div>
            <div style={{ fontSize: 13 }}>{error ?? "Запустите игру хотя бы один раз."}</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ProfileCard({
  profile: p,
  index,
  selected,
  onSelect,
}: {
  profile: ProfileInfo;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const isSelected = selected;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onSelect}
      style={{
        padding: 20,
        background: isSelected ? "rgba(20, 29, 53, 0.85)" : "rgba(20, 29, 53, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: isSelected ? "1.5px solid rgba(45, 212, 191, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 18,
        cursor: "pointer",
        boxShadow: isSelected
          ? "0 10px 36px rgba(0, 0, 0, 0.40), 0 0 0 3px rgba(45, 212, 191, 0.10) inset, 0 0 20px rgba(45, 212, 191, 0.08)"
          : "0 2px 10px rgba(0, 0, 0, 0.22)",
        transition: "background 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.25s, box-shadow 0.25s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <motion.div
          whileHover={{ scale: 1.06 }}
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: p.location === "steam_cloud" ? "rgba(96, 165, 250, 0.12)" : "rgba(45, 212, 191, 0.12)",
            border: `1px solid ${p.location === "steam_cloud" ? "rgba(96, 165, 250, 0.25)" : "rgba(45, 212, 191, 0.25)"}`,
            color: p.location === "steam_cloud" ? "var(--info)" : "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: isSelected ? `0 0 16px ${p.location === "steam_cloud" ? "rgba(96, 165, 250, 0.20)" : "rgba(45, 212, 191, 0.20)"}` : "none",
            transition: "box-shadow 0.2s",
          }}
        >
          {p.location === "steam_cloud" ? <Cloud size={22} /> : <HardDrive size={22} />}
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)" }}>{p.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
            {p.location === "steam_cloud" ? "Steam Cloud" : "Локальный"} · {formatRelativeDate(p.lastModified)}
          </div>
        </div>
        <motion.div animate={{ x: isSelected ? 4 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <ChevronRight size={16} color={isSelected ? "var(--accent)" : "var(--text-dim)"} />
        </motion.div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Stat label="Баланс" value={formatMoney(p.money)} />
        <Stat label="Опыт" value={formatNumber(p.experience)} />
        <Stat label="Модов" value={`${p.modsCount}`} />
      </div>
      <motion.div
        whileHover={{ y: -1 }}
        style={{ marginTop: 14, fontSize: 12, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 6 }}
      >
        <Truck size={12} /> {p.truck}
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: "var(--text-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>{value}</div>
    </div>
  );
}

function Truck({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}
