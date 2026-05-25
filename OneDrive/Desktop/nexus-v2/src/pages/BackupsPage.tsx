import { useEffect, useState } from "react";
import { Archive, RotateCcw, Trash2, Download, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { realTauri, type BackupInfo } from "../api/tauri";
import { useSettings } from "../store/useSettings";
import { formatRelativeDate } from "../lib/format";
import { useToast } from "../components/Toast";
import { useI18n } from "../context/I18nContext";

const springTrans = { type: "spring" as const, stiffness: 200, damping: 20 };

const glassBase = {
  background: "rgba(20, 29, 53, 0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
};

const hoverLiftEnter = {
  background: "rgba(20, 29, 53, 0.82)",
  borderColor: "rgba(255, 255, 255, 0.13)",
  boxShadow: "0 8px 28px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.04) inset",
  y: -2,
};

const hoverLiftLeave = {
  background: "rgba(20, 29, 53, 0.6)",
  borderColor: "rgba(255, 255, 255, 0.08)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.02) inset",
  y: 0,
};

const glassTransition = "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)";

function getBackupsPath(profilePath: string) {
  return profilePath.replace(/\\profiles.*/, "\\Backups_Manager");
}

export function BackupsPage() {
  const settings = useSettings();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const t = useI18n();

  function refresh() {
    const profilePath = settings.data?.profile_path;
    if (!profilePath) { setLoading(false); return; }
    setLoading(true);
    realTauri.list_backups(getBackupsPath(profilePath)).then((b) => { setBackups(b); setLoading(false); }).catch(() => { setBackups([]); setLoading(false); });
  }
  useEffect(refresh, [settings.data?.profile_path]);

  function create() {
    const profilePath = settings.data?.profile_path;
    const backupsPath = profilePath ? getBackupsPath(profilePath) : "";
    const name = `Backup_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
    if (!profilePath) return;
    realTauri.create_backup(profilePath, backupsPath, name, false).then(() => { toast.push(t("backupCreated"), { variant: "success" }); refresh(); }).catch((e: unknown) => toast.push(t("backupsError").replace("{e}", String(e)), { variant: "error" }));
  }
  function restore(name: string) {
    const profilePath = settings.data?.profile_path;
    if (!profilePath) return;
    const backupsPath = getBackupsPath(profilePath);
    realTauri.restore_backup(`${backupsPath}\\${name}`, profilePath).then(() => toast.push(t("backupRestored"), { variant: "success" })).catch((e: unknown) => toast.push(t("backupsError").replace("{e}", String(e)), { variant: "error" }));
  }
  function remove(name: string) {
    const profilePath = settings.data?.profile_path;
    if (!profilePath) return;
    const backupsPath = getBackupsPath(profilePath);
    realTauri.delete_backup(`${backupsPath}\\${name}`).then(() => { toast.push(t("backupDeleted"), { variant: "info" }); refresh(); }).catch((e: unknown) => toast.push(t("backupsError").replace("{e}", String(e)), { variant: "error" }));
  }

  const totalMb = backups.reduce((acc, b) => acc + b.size_mb, 0);

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1000 }}>
      <motion.header
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ display: "flex", alignItems: "center", marginBottom: 24 }}
      >
        <div style={{ flex: 1 }}>
          <div className="tag" style={{ marginBottom: 10, fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em" }}>
            {t("backupsTag")}
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
            {t("backupsTitle")}
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
            {t("backupsDesc")}
          </p>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={create}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.96 }}
          style={{ padding: "10px 18px", fontSize: 13 }}
        >
          <Download size={14} /> {t("backupsCreateBtn")}
        </motion.button>
      </motion.header>

      {/* Stat cards with depth layering */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
        <StatCard index={0} label={t("backupsCount")} value={`${backups.length}/7`} />
        <StatCard index={1} label={t("backupsTotal")} value={`${(totalMb / 1024).toFixed(2)} ГБ`} />
        <StatCard index={2} label={t("backupsLimit")} value="5 ГБ" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.06, ...springTrans }}
            className="shimmer"
            style={{ height: 72, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}
          />
        ))}
        {backups.map((b, i) => (
          <BackupRow key={b.name} backup={b} index={i} onRestore={() => restore(b.name)} onRemove={() => remove(b.name)} t={t} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, ...springTrans }}
      whileHover={{ scale: 1.02, y: -2 }}
      style={{
        padding: 16,
        background: "rgba(20, 29, 53, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 16,
        flex: 1,
        overflow: "hidden",
        position: "relative",
        transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "linear-gradient(90deg, var(--accent), transparent)",
        opacity: 0.5,
        borderRadius: "16px 16px 0 0",
        transition: "opacity 0.2s",
      }} />
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
        {value}
      </div>
    </motion.div>
  );
}

function BackupRow({ backup: b, index, onRestore, onRemove, t }: {
  backup: BackupInfo;
  index: number;
  onRestore: () => void;
  onRemove: () => void;
  t: (key: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.05, ...springTrans }}
      whileHover={{ scale: 1.015, y: -2 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 18px",
        background: "rgba(20, 29, 53, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 16,
        transition: glassTransition,
      }}
    >
      {/* Timeline icon */}
      <motion.div
        whileHover={{ scale: 1.06 }}
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: b.auto ? "rgba(96, 165, 250, 0.12)" : "rgba(45, 212, 191, 0.12)",
          border: `1px solid ${b.auto ? "rgba(96, 165, 250, 0.25)" : "rgba(45, 212, 191, 0.25)"}`,
          color: b.auto ? "var(--info)" : "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Archive size={18} />
      </motion.div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "var(--text-main)",
          marginBottom: 4,
        }}>
          {b.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={11} /> {formatRelativeDate(b.created_at)}
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{b.size_mb} МБ</span>
          <motion.span
            whileTap={{ scale: 0.95 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 10px",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              background: b.auto ? "rgba(96, 165, 250, 0.10)" : "rgba(251, 191, 36, 0.10)",
              color: b.auto ? "var(--info)" : "var(--warn)",
              border: `1px solid ${b.auto ? "rgba(96, 165, 250, 0.20)" : "rgba(251, 191, 36, 0.20)"}`,
            }}
          >
            {b.auto ? "AUTO" : "MANUAL"}
          </motion.span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <motion.button
          onClick={onRestore}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03, y: -1 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 14px",
            background: "rgba(45, 212, 191, 0.10)",
            border: "1px solid rgba(45, 212, 191, 0.20)",
            borderRadius: 10,
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(45, 212, 191, 0.18)";
            e.currentTarget.style.borderColor = "rgba(45, 212, 191, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(45, 212, 191, 0.10)";
            e.currentTarget.style.borderColor = "rgba(45, 212, 191, 0.20)";
          }}
        >
          <RotateCcw size={12} />
          {t("restoreBackup")}
        </motion.button>
        <motion.button
          onClick={onRemove}
          whileTap={{ scale: 0.90 }}
          whileHover={{ scale: 1.05 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            background: "transparent",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 10,
            color: "var(--danger)",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(251, 113, 133, 0.10)";
            e.currentTarget.style.borderColor = "rgba(251, 113, 133, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
          }}
        >
          <Trash2 size={13} />
        </motion.button>
      </div>
    </motion.div>
  );
}
