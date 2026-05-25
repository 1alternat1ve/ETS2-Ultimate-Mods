import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, FileWarning, ShieldCheck, Lightbulb, CheckCircle2, Loader2 } from "lucide-react";
import { realTauri } from "../api/tauri";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/Confirm";
import { useSettings } from "../store/useSettings";
import { formatBytes } from "../lib/format";
import { useI18n } from "../context/I18nContext";

type Tint = "danger" | "warn" | "teal" | "success";

const TINT: Record<Tint, string> = {
  danger: "var(--danger)",
  warn: "var(--warn)",
  teal: "var(--accent)",
  success: "var(--success)",
};

const TINT_ICON: Record<Tint, typeof Trash2> = {
  danger: Trash2,
  warn: FileWarning,
  teal: ShieldCheck,
  success: Lightbulb,
};

type Result = { freedMb?: number; backup?: string; removed?: string[] } | null;

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

export function OptimizePage() {
  const t = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const settings = useSettings();
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, Result>>({});

  async function cleanGameFiles() {
    const gamePath = settings.data?.game_path;
    if (!gamePath) { toast.push(t("optimizeNoPath"), { variant: "error" }); return; }
    const ok = await confirm({
      title: t("optimizeCacheTitle"),
      message:
        `${t("optimizeCacheWarn")}\n\n${t("optimizeCacheNote")}`,
      variant: "danger",
      confirmLabel: t("optimizeCacheBtn"),
    });
    if (!ok) return;
    setBusy("cache");
    try {
      const r = await realTauri.clean_game_files(gamePath);
      setResults((p) => ({ ...p, cache: { freedMb: r.freed_mb, removed: r.removed } }));
      toast.push(t("optimizeCacheDone").replace("{size}", formatBytes(r.freed_mb * 1024 * 1024)), { variant: "success" });
    } catch (e) {
      toast.push(t("optimizeCacheError").replace("{e}", String(e)), { variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function cleanCrashDumps() {
    const gamePath = settings.data?.game_path;
    if (!gamePath) { toast.push(t("optimizeNoPath"), { variant: "error" }); return; }
    const ok = await confirm({
      title: t("optimizeDumpsTitle"),
      message:
        t("optimizeDumpsDesc"),
      variant: "warn",
      confirmLabel: t("optimizeDumpsBtn"),
    });
    if (!ok) return;
    setBusy("dumps");
    try {
      const r = await realTauri.clean_crash_dumps(gamePath);
      if (r.removed.length === 0) {
        toast.push(t("optimizeDumpsEmpty"), { variant: "info" });
      } else {
        setResults((p) => ({ ...p, dumps: { freedMb: r.freed_mb, removed: r.removed } }));
        toast.push(t("optimizeDumpsDone").replace("{n}", String(r.removed.length)).replace("{size}", formatBytes(r.freed_mb * 1024 * 1024)), { variant: "success" });
      }
    } catch (e) {
      toast.push(t("optimizeGenericError").replace("{e}", String(e)), { variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  function steamValidate() {
    realTauri.open_url("steam://validate/227300");
    toast.push(t("optimizeSteamValidate"), { variant: "info" });
  }

  async function applyBufferPageFix() {
    const gamePath = settings.data?.game_path;
    if (!gamePath) { toast.push(t("optimizeNoPath"), { variant: "error" }); return; }
    const ok = await confirm({
      title: t("optimizeMemoryOptTitle"),
      message:
        t("optimizeMemoryOptDesc"),
      variant: "success",
      confirmLabel: t("optimizeMemoryOptPatch"),
    });
    if (!ok) return;
    setBusy("buffix");
    try {
      const r = await realTauri.apply_buffer_page_fix(gamePath);
      setResults((p) => ({ ...p, buffix: { backup: r.created_backup } }));
      toast.push(t("optimizeMemoryOptSuccess"), { variant: "success" });
    } catch (e) {
      toast.push(t("optimizeMemoryOptError").replace("{e}", String(e)), { variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ padding: "28px 28px 40px", maxWidth: 1100 }}>
      <motion.header
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ marginBottom: 28 }}
      >
        <div className="tag" style={{ marginBottom: 12, fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em" }}>
          {t("optimizeTag")}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 8px", color: "var(--text-main)" }}>
          {t("optimizeTitle")}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 580, lineHeight: 1.6, margin: 0 }}>
          {t("optimizeDesc")}
        </p>
      </motion.header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ActionCard
          index={0}
          tint="danger"
          title={t("optimizeCacheCleanTitle")}
          desc={t("optimizeCacheCleanDesc")}
          buttonLabel={t("optimizeCacheCleanBtn")}
          busy={busy === "cache"}
          result={results.cache}
          onClick={cleanGameFiles}
        />

        <ActionCard
          index={1}
          tint="warn"
          title={t("optimizeDumpsCleanTitle")}
          desc={t("optimizeDumpsCleanDesc")}
          buttonLabel={t("optimizeDumpsCleanBtn")}
          busy={busy === "dumps"}
          result={results.dumps}
          onClick={cleanCrashDumps}
        />

        <ActionCard
          index={2}
          tint="teal"
          title={t("optimizeSteamTitle")}
          desc={t("optimizeSteamDesc")}
          buttonLabel={t("optimizeSteamBtn")}
          busy={false}
          result={null}
          onClick={steamValidate}
          hint={t("optimizeSteamHint")}
        />

        <ActionCard
          index={3}
          tint="success"
          title={t("optimizeBufferTitle")}
          desc={t("optimizeBufferDesc")}
          buttonLabel={t("optimizeBufferBtn")}
          busy={busy === "buffix"}
          result={results.buffix}
          onClick={applyBufferPageFix}
        />
      </div>
    </div>
  );
}

function ActionCard({
  index,
  tint,
  title,
  desc,
  buttonLabel,
  busy,
  result,
  onClick,
  hint,
}: {
  index: number;
  tint: Tint;
  title: string;
  desc: string;
  buttonLabel: string;
  busy: boolean;
  result: Result;
  onClick: () => void;
  hint?: string;
}) {
  const t = useI18n();
  const color = TINT[tint];
  const IconComp = TINT_ICON[tint];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.01, y: -2 }}
      style={{
        padding: 0,
        overflow: "hidden",
        background: "rgba(20, 29, 53, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderLeft: `4px solid ${color}`,
        borderRadius: 16,
        transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <motion.div
            whileHover={{ scale: 1.06 }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `${color}18`,
              border: `1px solid ${color}40`,
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 0 20px ${color}15`,
              transition: "box-shadow 0.2s",
            }}
          >
            <IconComp size={22} />
          </motion.div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px", color: "var(--text-main)" }}>{title}</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{desc}</p>
            {hint && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", marginTop: 8, letterSpacing: "0.04em" }}>
                {hint}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <motion.button
            onClick={onClick}
            disabled={busy}
            whileHover={busy ? {} : { scale: 1.025, y: -1 }}
            whileTap={busy ? {} : { scale: 0.97 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 12,
              background: color,
              border: `1px solid ${color}`,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              height: 40,
              opacity: busy ? 0.65 : 1,
              cursor: busy ? "not-allowed" : "pointer",
              transition: "opacity 0.15s, filter 0.15s, box-shadow 0.15s",
              boxShadow: !busy ? `0 8px 24px ${color}40` : "none",
            }}
          >
            {busy ? <Loader2 size={14} style={{ animation: "spin-slow 1s linear infinite" }} /> : <IconComp size={14} />}
            {busy ? t("optimizeBusy") : buttonLabel}
          </motion.button>

          {result && (
            <motion.div
              initial={{ opacity: 0, x: -8, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                fontSize: 12,
                color: "var(--success)",
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.25)",
                borderRadius: 20,
              }}
            >
              <CheckCircle2 size={14} />
              {result.freedMb !== undefined && (
                <span>{t("optimizeResultFreed").replace("{size}", formatBytes(result.freedMb * 1024 * 1024))}</span>
              )}
              {result.backup && (
                <span>
                  {t("optimizeResultBackup").replace("{path}", result.backup)}
                </span>
              )}
            </motion.div>
          )}
        </div>

        {result?.removed && result.removed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              marginTop: 14,
              padding: "12px 14px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 12,
              fontSize: 11,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.7,
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}>
            {result.removed.map((r) => (
              <div key={r}>· {r}</div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
