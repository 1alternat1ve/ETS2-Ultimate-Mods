import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  User,
  Wrench,
  Sparkles,
  Cpu,
  Archive,
  ScrollText,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Section } from "../App";
import { useI18n } from "../context/I18nContext";

const NAV_ITEMS: { id: Section; labelKey: string; Icon: typeof Home; groupKey?: string }[] = [
  { id: "home", labelKey: "home", Icon: Home, groupKey: "navStart" },
  { id: "profiles", labelKey: "profiles", Icon: User, groupKey: "navGame" },
  { id: "graphics", labelKey: "graphics", Icon: Sparkles, groupKey: "navGame" },
  { id: "optimize", labelKey: "optimize", Icon: Cpu, groupKey: "navHelp" },
  { id: "tools", labelKey: "tools", Icon: Wrench, groupKey: "navHelp" },
  { id: "backups", labelKey: "backups", Icon: Archive, groupKey: "navHelp" },
  { id: "logs", labelKey: "logs", Icon: ScrollText, groupKey: "navHelp" },
  { id: "faq", labelKey: "faq", Icon: HelpCircle, groupKey: "navHelp" },
  { id: "settings", labelKey: "settings", Icon: Settings, groupKey: "navHelp" },
];

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

interface ProfileData {
  name: string;
  status: "convoy" | "solo";
  modSizeMb: number;
  lastRun: string;
}

const DEFAULT_PROFILE: ProfileData = {
  name: "NexusDriver",
  status: "solo",
  modSizeMb: 12800,
  lastRun: "2",
};

function PulseDot({ color }: { color: string }) {
  return (
    <motion.span
      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  );
}

function ProfileBlock({ profile }: { profile: ProfileData }) {
  const t = useI18n();
  const [hovered, setHovered] = useState(false);
  const initials = profile.name.slice(0, 2).toUpperCase();
  const avatarColor = hashColor(profile.name);
  const isConvoy = profile.status === "convoy";
  const statusColor = isConvoy ? "var(--success)" : "var(--warn)";
  const statusLabel = isConvoy ? t("convoy") : t("solo");

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
      style={{
        margin: "8px 10px",
        borderRadius: 12,
        background: "rgba(20, 29, 53, 0.50)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "12px 14px",
        cursor: "default",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Avatar */}
        <motion.div
          animate={hovered ? { scale: 1.05 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: avatarColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
            boxShadow: `0 2px 10px ${avatarColor}55`,
          }}
        >
          {initials}
        </motion.div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-main)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {profile.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            <PulseDot color={statusColor} />
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: statusColor,
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded info on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="info"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                paddingTop: 8,
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "var(--text-dim)" }}>{t("mods")}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {Math.round(profile.modSizeMb / 1024)} ГБ
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "var(--text-dim)" }}>{t("lastRun")}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {profile.lastRun} {t("ago")}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Sidebar({
  active,
  onSelect,
}: {
  active: Section;
  onSelect: (s: Section) => void;
}) {
  const t = useI18n();
  let lastGroup = "";
  return (
    <aside
      style={{
        gridArea: "sidebar",
        background: "var(--bg-elev-1)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        position: "relative",
        width: 240,
      }}
    >
      {/* Top teal accent stripe */}
      <div
        style={{
          height: 3,
          background: "linear-gradient(90deg, var(--accent), var(--accent-dark))",
          flexShrink: 0,
        }}
      />

      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 14px 14px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0b1120",
            fontWeight: 900,
            fontSize: 18,
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(45,212,191,0.25)",
          }}
        >
          N
        </div>
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.02em",
              color: "var(--text-main)",
            }}
          >
            NEXUS v2
          </div>
          <div
            className="mono dim caps"
            style={{
              fontSize: 9,
              letterSpacing: "0.15em",
              marginTop: 2,
            }}
          >
            ETS2
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "10px 8px", display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>
        {NAV_ITEMS.map((it) => {
          const showGroup = it.groupKey && t(it.groupKey) !== lastGroup;
          lastGroup = it.groupKey ? t(it.groupKey) : "";
          const isActive = active === it.id;
          const { Icon } = it;
          return (
            <div key={it.id}>
              {showGroup && (
                <div
                  className="mono caps"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    color: "var(--text-ghost)",
                    padding: "10px 14px 4px",
                  }}
                >
                  {t(it.groupKey ?? "")}
                </div>
              )}
              <motion.button
                onClick={() => onSelect(it.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: "var(--r-sm)",
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  marginBottom: 1,
                  borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
                <span>{t(it.labelKey)}</span>
              </motion.button>
            </div>
          );
        })}
      </nav>

      {/* Profile block */}
      <ProfileBlock profile={DEFAULT_PROFILE} />

      {/* Footer */}
      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          className="mono dim"
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textAlign: "center",
          }}
        >
          v1.0.0 · ALPHA
        </div>
      </div>
    </aside>
  );
}
