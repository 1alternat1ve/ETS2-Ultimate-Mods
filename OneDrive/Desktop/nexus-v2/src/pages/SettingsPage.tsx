import { useEffect, useState } from "react";
import { Settings as SettingsIcon, FolderOpen, Key, Palette, Volume2, Globe, Maximize2, Shield, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { realTauri, type Settings } from "../api/tauri";
import { useToast } from "../components/Toast";
import { useI18n } from "../context/I18nContext";

const THEMES = [
  { id: "premium-dark", name: "Premium Dark" },
  { id: "alpine", name: "Alpine" },
  { id: "cosmic", name: "Cosmic" },
  { id: "sunset", name: "Sunset" },
  { id: "minimal", name: "Minimal" },
];

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

export function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [token, setToken] = useState("");
  const [tokenStatus, setTokenStatus] = useState<{ valid: boolean; rate_limit: number } | null>(null);
  const toast = useToast();
  const t = useI18n();

  useEffect(() => {
    realTauri.get_settings().then(setS);
    realTauri.get_github_token().then(setToken);
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (!s) return;
    const next = { ...s, [key]: value };
    setS(next);
    realTauri.set_settings(next);
    if (key === "language") {
      window.location.reload();
    }
  }

  function validateToken() {
    realTauri.validate_github_token(token)
      .then((r) => {
        setTokenStatus(r);
        if (r.valid) toast.push(`${t("tokenValid")}. ${t("reqPerHour")} ${r.rate_limit}`, { variant: "success" });
        else toast.push(t("tokenInvalid"), { variant: "error" });
      });
  }

  if (!s) return (
    <div style={{ padding: 28 }}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="shimmer"
        style={{ height: 400, borderRadius: 18, border: "1px solid rgba(255,255,255,0.05)" }}
      />
    </div>
  );

  return (
    <div style={{ padding: 28, maxWidth: 900 }}>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <SettingsIcon size={22} color="var(--accent)" />
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
            {t("settingsTitle")}
          </h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
          Все настройки хранятся в <span style={{ fontFamily: "var(--font-mono)" }}>%APPDATA%/ETS2Nexus/settings.json</span>
        </p>
      </motion.div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Section
          delay={0.05}
          title={t("paths")}
          Icon={<FolderOpen size={16} />}
        >
          <PathField label={t("pathGame")} value={s.game_path} onPick={(v) => update("game_path", v)} t={t} />
          <PathField label={t("pathMods")} value={s.mods_path} onPick={(v) => update("mods_path", v)} t={t} />
          <PathField label={t("pathProfiles")} value={s.profile_path} onPick={(v) => update("profile_path", v)} t={t} />
        </Section>

        <Section
          delay={0.10}
          title={t("githubToken")}
          Icon={<Key size={16} />}
        >
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
            {t("githubTokenDesc")}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("tokenPlaceholder")}
              style={{
                flex: 1,
                minWidth: 200,
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(20, 29, 53, 0.6)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-main)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(45,212,191,0.40)"; e.target.style.boxShadow = "0 0 0 3px rgba(45,212,191,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
            />
            <motion.button
              className="btn"
              onClick={validateToken}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              style={{ padding: "10px 16px", fontSize: 13 }}
            >
              <RefreshCw size={13} /> {t("validate")}
            </motion.button>
            <motion.button
              className="btn btn-primary"
              onClick={() => {
                realTauri.set_github_token(token).then(async () => {
                  try { const s = await realTauri.get_settings(); update("github_token", s.github_token); } catch {}
                  toast.push(t("tokenSaved"), { variant: "success" });
                });
              }}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              style={{ padding: "10px 16px", fontSize: 13 }}
            >
              {t("save")}
            </motion.button>
          </div>
          {tokenStatus && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 10, fontSize: 12, color: tokenStatus.valid ? "var(--success)" : "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
              {tokenStatus.valid ? (
                <><Shield size={13} /> {t("tokenValid")} · {tokenStatus.rate_limit} {t("reqPerHour")}</>
              ) : (
                <><Shield size={13} style={{ color: "var(--danger)" }} /> {t("tokenInvalid")}</>
              )}
            </motion.div>
          )}
        </Section>

        <Section
          delay={0.15}
          title={t("appearance")}
          Icon={<Palette size={16} />}
        >
          <Row label={t("theme")}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {THEMES.map((t) => (
                <motion.button
                  key={t.id}
                  onClick={() => update("theme", t.id)}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: s.theme === t.id ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,0.08)",
                    background: s.theme === t.id ? "rgba(45, 212, 191, 0.12)" : "transparent",
                    color: s.theme === t.id ? "var(--accent)" : "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: s.theme === t.id ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {t.name}
                </motion.button>
              ))}
            </div>
          </Row>
          <Row label={`${t("uiScale")} ${(s.ui_scale * 100).toFixed(0)}%`}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: 260 }}>
              <div style={{ flex: 1, position: "relative", height: 5 }}>
                <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", height: 5, width: `${((s.ui_scale - 0.8) / 0.7) * 100}%`, background: "var(--accent)", borderRadius: 3, boxShadow: "0 0 8px rgba(45,212,191,0.30)" }} />
                <input
                  type="range"
                  min={0.8}
                  max={1.5}
                  step={0.05}
                  value={s.ui_scale}
                  onChange={(e) => update("ui_scale", +e.target.value)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: 5,
                    appearance: "none",
                    background: "transparent",
                    outline: "none",
                    cursor: "pointer",
                    margin: 0,
                  }}
                />
              </div>
            </div>
          </Row>
          <Row label={t("language")}>
            <select
              value={s.language}
              onChange={(e) => update("language", e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(20, 29, 53, 0.6)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--text-main)",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(45,212,191,0.40)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <option value="ru">{t("russian")}</option>
              <option value="en">{t("english")}</option>
            </select>
          </Row>
        </Section>

        <Section
          delay={0.20}
          title={t("behavior")}
          Icon={<Volume2 size={16} />}
        >
          <ToggleRow label={t("autoBackup")} checked={s.auto_backup} onChange={(v) => update("auto_backup", v)} />
          <ToggleRow label={t("checkUpdates")} checked={s.check_updates_on_start} onChange={(v) => update("check_updates_on_start", v)} />
          <ToggleRow label={t("backgroundUpdater")} checked={s.background_updater} onChange={(v) => update("background_updater", v)} />
        </Section>
      </div>
    </div>
  );
}

function Section({ Icon, title, children, delay = 0 }: { Icon: React.ReactNode; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.01, y: -2 }}
      style={{
        padding: 22,
        background: "rgba(20, 29, 53, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 16,
        transition: glassTransition,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ color: "var(--accent)", display: "flex" }}>
          {Icon}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)" }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      {children}
    </div>
  );
}

function PathField({ label, value, onPick, t }: { label: string; value: string; onPick: (v: string) => void; t: (k: string) => string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={value}
          onChange={(e) => onPick(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(20, 29, 53, 0.6)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-main)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => { e.target.style.borderColor = "rgba(45,212,191,0.40)"; e.target.style.boxShadow = "0 0 0 3px rgba(45,212,191,0.08)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
        />
        <motion.button
          className="btn"
          title={t("pickFolder")}
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          style={{ padding: "10px 12px" }}
          onClick={async () => {
            try {
              const picked = await openDialog({
                directory: true,
                multiple: false,
                defaultPath: value || undefined,
                title: label,
              });
              if (typeof picked === "string" && picked) {
                onPick(picked);
              }
            } catch (e) {
              console.error("dialog open failed:", e);
            }
          }}
        >
          <FolderOpen size={14} />
        </motion.button>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      padding: "10px 14px",
      borderRadius: 12,
      background: checked ? "rgba(45, 212, 191, 0.06)" : "rgba(20, 29, 53, 0.4)",
      backdropFilter: "blur(16px)",
      border: `1px solid ${checked ? "rgba(45, 212, 191, 0.20)" : "rgba(255, 255, 255, 0.06)"}`,
      transition: "all 0.2s",
    }}>
      <span style={{ fontSize: 13, color: checked ? "var(--text-main)" : "var(--text-muted)" }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        style={{
          width: 42,
          height: 24,
          borderRadius: 12,
          background: checked ? "var(--accent)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${checked ? "var(--accent)" : "rgba(255, 255, 255, 0.10)"}`,
          cursor: "pointer",
          position: "relative",
          transition: "all 0.2s",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ x: checked ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: checked ? "#fff" : "var(--text-dim)",
            position: "absolute",
            top: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}
