import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wrench, Truck, GitBranch, RefreshCw, Archive, Download, RotateCcw, Loader2 } from "lucide-react";
import { realTauri, type ProfileInfo } from "../api/tauri";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/Confirm";
import { useSettings } from "../store/useSettings";
import { useI18n } from "../context/I18nContext";

type BuildType = "convoy" | "solo";

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

export function ToolsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const settings = useSettings();
  const t = useI18n();

  const [buildType, setBuildType] = useState<BuildType>("convoy");
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const path = settings.data?.profile_path;
    if (!path) { setProfiles([]); return; }
    realTauri.list_profiles(path).then((p) => {
      setProfiles(p);
      if (p.length > 0) setSelectedProfileId(p[0].id);
    });
  }, [settings.data?.profile_path]);

  async function installCargoFix() {
    const s = settings.data;
    if (!s?.game_path) { toast.push(t("toolsGamePathNotSet"), { variant: "error" }); return; }
    setBusy((b) => ({ ...b, cargofix: true }));
    try {
      const modsPath = s.mods_path || s.game_path.replace(/\\Euro Truck Simulator 2\\.*/, "\\Euro Truck Simulator 2\\mod");
      const r = await realTauri.fix_trailer_stutter(
        modsPath,
        s.github_owner || "1alternat1ve",
        s.github_repo || "ETS2-Ultimate-Mods",
        s.github_tag || "mega",
        s.github_token || undefined
      );
      toast.push(t("toolsCargoFixDone").replace("{size}", String(r.size_mb)), { variant: "success" });
    } catch (e) {
      toast.push(t("toolsError").replace("{e}", String(e)), { variant: "error" });
    } finally {
      setBusy((b) => ({ ...b, cargofix: false }));
    }
  }

  async function fixModOrder() {
    const profile = profiles.find((p) => p.id === selectedProfileId);
    console.log("[fixModOrder] profiles:", JSON.stringify(profiles.map(p => ({ id: p.id, name: p.name, sii_path: p.siiPath }))));
    const ok = await confirm({
      title: t("toolsConfirmTitle"),
      message: t("toolsConfirmMsg1") + (profile?.name ?? selectedProfileId) + t("toolsConfirmMsg2") + buildType + t("toolsConfirmMsg3"),
      variant: "info",
      confirmLabel: t("toolsConfirmBtn"),
    });
    if (!ok) return;

    if (!profile?.siiPath) {
      toast.push(t("toolsProfileNotFound"), { variant: "error" });
      return;
    }

    setBusy((b) => ({ ...b, modorder: true }));
    try {
      const r = await realTauri.fix_mod_order(profile.siiPath, buildType);
      toast.push(t("toolsModOrderDone").replace("{r}", String(r)), { variant: "success" });
    } catch (e) {
      toast.push(t("toolsError").replace("{e}", String(e)), { variant: "error" });
    } finally {
      setBusy((b) => ({ ...b, modorder: false }));
    }
  }

  async function resetManifest() {
    const ok = await confirm({
      title: t("toolsResetConfirmTitle"),
      message: t("toolsResetConfirmMsg"),
      variant: "warn",
      confirmLabel: t("toolsResetBtn"),
    });
    if (!ok) return;

    setBusy((b) => ({ ...b, manifest: true }));
    try {
      await realTauri.reset_manifest();
      toast.push(t("toolsResetDone"), { variant: "success" });
    } catch (e) {
      toast.push(t("toolsError").replace("{e}", String(e)), { variant: "error" });
    } finally {
      setBusy((b) => ({ ...b, manifest: false }));
    }
  }

  async function createBackup() {
    const profilePath = settings.data?.profile_path;
    if (!profilePath) { toast.push(t("toolsNoProfilePath"), { variant: "error" }); return; }
    const backupsPath = profilePath.replace(/\\profiles.*/, "\\Backups_Manager");
    const name = `Backup_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.zip`;
    setBusy((b) => ({ ...b, backup: true }));
    try {
      await realTauri.create_backup(profilePath, backupsPath, name, false);
      toast.push(t("toolsBackupDone"), { variant: "success" });
    } catch (e) {
      toast.push(t("toolsError").replace("{e}", String(e)), { variant: "error" });
    } finally {
      setBusy((b) => ({ ...b, backup: false }));
    }
  }

  function openBackupFolder() {
    const profilePath = settings.data?.profile_path ?? "";
    const backupsPath = profilePath.replace(/\\profiles.*/, "\\Backups_Manager");
    realTauri.open_path(backupsPath);
    toast.push(t("toolsOpenBackupsToast"), { variant: "info" });
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
          {t("toolsTag")}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 8px", color: "var(--text-main)" }}>
          {t("toolsTitle")}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 580, lineHeight: 1.6, margin: 0 }}>
          {t("toolsDesc")}
        </p>
      </motion.header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* 1 — CargoFix */}
        <ToolCard index={0} tint="var(--accent)" icon={<Truck size={20} />} title={t("toolsCargoFixTitle")}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
            {t("toolsCargoFixDesc")}
          </p>
          <motion.button
            onClick={installCargoFix}
            disabled={busy.cargofix}
            whileHover={busy.cargofix ? {} : { scale: 1.025, y: -1 }}
            whileTap={busy.cargofix ? {} : { scale: 0.97 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 12,
              background: "var(--accent)",
              border: "1px solid var(--accent)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              height: 40,
              opacity: busy.cargofix ? 0.65 : 1,
              cursor: busy.cargofix ? "not-allowed" : "pointer",
            }}
          >
            {busy.cargofix ? <Loader2 size={14} style={{ animation: "spin-slow 1s linear infinite" }} /> : <Download size={14} />}
            {busy.cargofix ? t("toolsBusy") : t("toolsCargoFixBtn")}
          </motion.button>
        </ToolCard>

        {/* 2 — Fix mod order */}
        <ToolCard index={1} tint="var(--accent)" icon={<Wrench size={20} />} title={t("toolsModOrderTitle")}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
            {t("toolsModOrderDesc")}
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <BuildTypeButton
              active={buildType === "convoy"}
              label={t("toolsConvoyLabel")}
              sublabel={t("toolsConvoySub")}
              onClick={() => setBuildType("convoy")}
            />
            <BuildTypeButton
              active={buildType === "solo"}
              label={t("toolsSoloLabel")}
              sublabel={t("toolsSoloSub")}
              onClick={() => setBuildType("solo")}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 6,
            }}>
              {t("toolsProfileLabel")}
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 9,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-main)",
                fontSize: 13,
                outline: "none",
              }}
            >
              {profiles.length === 0 && <option value="">{t("toolsNoProfiles")}</option>}
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.location === "steam_cloud" ? t("toolsCloud") : t("toolsLocal")})
                </option>
              ))}
            </select>
          </div>

          <motion.button
            onClick={fixModOrder}
            disabled={busy.modorder}
            whileHover={busy.modorder ? {} : { scale: 1.025, y: -1 }}
            whileTap={busy.modorder ? {} : { scale: 0.97 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 12,
              background: "var(--bg-elev-3)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-main)",
              fontWeight: 700,
              fontSize: 13,
              height: 40,
              opacity: busy.modorder ? 0.65 : 1,
              cursor: busy.modorder ? "not-allowed" : "pointer",
            }}
          >
            {busy.modorder ? <Loader2 size={14} style={{ animation: "spin-slow 1s linear infinite" }} /> : <Wrench size={14} />}
            {busy.modorder ? t("toolsBusy") : t("toolsFixModsBtn")}
          </motion.button>
        </ToolCard>

        {/* 3 — Reset manifest */}
        <ToolCard index={2} tint="var(--warn)" icon={<RefreshCw size={20} />} title={t("toolsResetTitle")}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
            {t("toolsResetDesc")}
          </p>
          <motion.button
            onClick={resetManifest}
            disabled={busy.manifest}
            whileHover={busy.manifest ? {} : { scale: 1.025, y: -1 }}
            whileTap={busy.manifest ? {} : { scale: 0.97 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 12,
              background: "var(--warn)",
              border: "1px solid var(--warn)",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              height: 40,
              opacity: busy.manifest ? 0.65 : 1,
              cursor: busy.manifest ? "not-allowed" : "pointer",
            }}
          >
            {busy.manifest ? <Loader2 size={14} style={{ animation: "spin-slow 1s linear infinite" }} /> : <RotateCcw size={14} />}
            {busy.manifest ? t("toolsBusy") : t("toolsResetBtn")}
          </motion.button>
        </ToolCard>

        {/* 4 — Backups */}
        <ToolCard index={3} tint="var(--accent)" icon={<Archive size={20} />} title={t("toolsBackupsTitle")}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.6 }}>
            {t("toolsBackupsDesc")}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <motion.button
              onClick={createBackup}
              disabled={busy.backup}
              whileHover={busy.backup ? {} : { scale: 1.025, y: -1 }}
              whileTap={busy.backup ? {} : { scale: 0.97 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 12,
                background: "var(--accent)",
                border: "1px solid var(--accent)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                height: 40,
                opacity: busy.backup ? 0.65 : 1,
                cursor: busy.backup ? "not-allowed" : "pointer",
              }}
            >
              {busy.backup ? <Loader2 size={14} style={{ animation: "spin-slow 1s linear infinite" }} /> : <Download size={14} />}
              {busy.backup ? t("toolsBusy") : t("toolsCreateBackupBtn")}
            </motion.button>
            <motion.button
              onClick={openBackupFolder}
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 12,
                background: "var(--bg-elev-3)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "var(--text-main)",
                fontWeight: 700,
                fontSize: 13,
                height: 40,
                cursor: "pointer",
              }}
            >
              <GitBranch size={14} />
              {t("toolsOpenBackupsBtn")}
            </motion.button>
          </div>
        </ToolCard>
      </div>
    </div>
  );
}

function ToolCard({ index, tint, icon, title, children }: {
  index: number; tint: string; icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
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
        borderLeft: `4px solid ${tint}`,
        borderRadius: 16,
        transition: glassTransition,
      }}
    >
      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <motion.div
            whileHover={{ scale: 1.06 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
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
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
            {title}
          </h3>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function BuildTypeButton({ active, label, sublabel, onClick }: {
  active: boolean; label: string; sublabel: string; onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 14px",
        borderRadius: 12,
        background: active ? "rgba(45,212,191,0.10)" : "rgba(20, 29, 53, 0.4)",
        backdropFilter: "blur(16px)",
        border: active ? "1.5px solid var(--accent)" : "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      <div style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `2px solid ${active ? "var(--accent)" : "var(--text-dim)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: active ? "0 0 10px rgba(45, 212, 191, 0.30)" : "none",
        transition: "box-shadow 0.15s",
      }}>
        {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--accent)" : "var(--text-main)" }}>
          {label}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 1 }}>{sublabel}</div>
      </div>
    </motion.button>
  );
}
