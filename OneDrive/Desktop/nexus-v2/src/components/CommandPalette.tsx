import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Cog,
  Wrench,
  Sparkles,
  Cpu,
  FolderOpen,
  ExternalLink,
  Home,
  Archive,
  ScrollText,
  HelpCircle,
  User,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Section } from "../App";
import { useI18n } from "../context/I18nContext";

export type PaletteCommand = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  Icon?: typeof Search;
  shortcut?: string;
  run: () => void;
};

export function buildDefaultCommands(opts: {
  goto: (s: Section) => void;
  startInstall: () => void;
  openSettings: () => void;
  launchGame: () => void;
  t: (k: string) => string;
}): PaletteCommand[] {
  const { goto, startInstall, openSettings, launchGame, t } = opts;
  return [
    { id: "nav-home", label: t("cmdNavHome"), group: t("grpNav"), Icon: Home, run: () => goto("home") },
    { id: "nav-profiles", label: t("cmdNavProfiles"), group: t("grpNav"), Icon: User, run: () => goto("profiles") },
    { id: "nav-graphics", label: t("cmdNavGraphics"), group: t("grpNav"), Icon: Sparkles, run: () => goto("graphics") },
    { id: "nav-optimize", label: t("cmdNavOptimize"), group: t("grpNav"), Icon: Cpu, run: () => goto("optimize") },
    { id: "nav-tools", label: t("cmdNavTools"), group: t("grpNav"), Icon: Wrench, run: () => goto("tools") },
    { id: "nav-backups", label: t("cmdNavBackups"), group: t("grpNav"), Icon: Archive, run: () => goto("backups") },
    { id: "nav-logs", label: t("cmdNavLogs"), group: t("grpNav"), Icon: ScrollText, run: () => goto("logs") },
    { id: "nav-faq", label: t("cmdNavFaq"), group: t("grpNav"), Icon: HelpCircle, run: () => goto("faq") },

    { id: "act-install", label: t("cmdInstall"), hint: t("cmdInstallHint"), group: t("grpActions"), Icon: Play, run: startInstall },
    { id: "act-launch", label: t("cmdLaunch"), group: t("grpActions"), Icon: Play, run: launchGame },
    { id: "act-pause", label: t("cmdPause"), group: t("grpActions"), Icon: Pause, run: () => {} },

    { id: "ext-settings", label: t("cmdOpenSettings"), group: t("grpSettings"), Icon: Cog, run: openSettings },
    { id: "ext-mods-folder", label: t("cmdOpenModsFolder"), group: t("grpFolders"), Icon: FolderOpen, run: () => {} },
    { id: "ext-profile-folder", label: t("cmdOpenProfileFolder"), group: t("grpFolders"), Icon: FolderOpen, run: () => {} },
    { id: "ext-promods", label: t("cmdPromods"), group: t("grpExternal"), Icon: ExternalLink, run: () => window.open("https://promods.net", "_blank") },
    { id: "ext-truckersmp", label: t("cmdTruckersmp"), group: t("grpExternal"), Icon: ExternalLink, run: () => window.open("https://truckersmp.com", "_blank") },
  ];
}

export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const t = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(s) || (c.hint ?? "").toLowerCase().includes(s)
    );
  }, [q, commands]);

  useEffect(() => {
    if (idx >= filtered.length) setIdx(0);
  }, [filtered.length, idx]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[idx];
      if (cmd) { cmd.run(); onClose(); }
    }
  }

  const grouped = useMemo(() => {
    const out: { group: string; items: PaletteCommand[] }[] = [];
    for (const c of filtered) {
      let last = out[out.length - 1];
      if (!last || last.group !== c.group) {
        last = { group: c.group, items: [] };
        out.push(last);
      }
      last.items.push(c);
    }
    return out;
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 5, 12, 0.60)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 100,
            zIndex: 1000,
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.93, opacity: 0, y: -14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onKeyDown={onKeyDown}
            style={{
              width: 580,
              maxWidth: "90vw",
              background: "rgba(20, 29, 53, 0.88)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              borderRadius: 18,
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px rgba(45,212,191,0.04)",
              overflow: "hidden",
            }}
          >
            {/* Search bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "15px 18px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(0, 0, 0, 0.15)",
              }}
            >
              <Search size={16} color="var(--accent)" strokeWidth={2.5} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("cmdSearchPlaceholder")}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  fontSize: 14,
                  padding: 0,
                  color: "var(--text-main)",
                  outline: "none",
                }}
              />
              <kbd
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-mono)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  letterSpacing: "0.05em",
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Command list */}
            <div
              ref={listRef}
              style={{
                maxHeight: 360,
                overflowY: "auto",
                padding: "6px",
              }}
            >
              {grouped.length === 0 && (
                <div
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-dim)",
                    fontSize: 13,
                  }}
                >
                  {t("cmdSearchEmpty")}
                </div>
              )}
              {grouped.map((g) => (
                <div key={g.group} style={{ marginBottom: 4 }}>
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      fontWeight: 700,
                      color: "var(--text-dim)",
                      padding: "8px 10px 4px",
                    }}
                  >
                    {g.group}
                  </div>
                  {g.items.map((cmd) => {
                    const i = filtered.indexOf(cmd);
                    const isActive = i === idx;
                    const Icon = cmd.Icon;
                    return (
                      <motion.div
                        key={cmd.id}
                        onMouseEnter={() => setIdx(i)}
                        onClick={() => { cmd.run(); onClose(); }}
                        whileHover={{ scale: 1.01, x: 2 }}
                        whileTap={{ scale: 0.99 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 10px",
                          borderRadius: 11,
                          background: isActive ? "rgba(45, 212, 191, 0.12)" : "transparent",
                          color: isActive ? "var(--accent)" : "var(--text-main)",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 400,
                          transition: "background 0.12s, color 0.12s",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: isActive ? "var(--accent)" : "rgba(255, 255, 255, 0.05)",
                            color: isActive ? "#0b1120" : "var(--text-dim)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.12s",
                            boxShadow: isActive ? "0 0 12px rgba(45, 212, 191, 0.30)" : "none",
                          }}
                        >
                          {Icon ? <Icon size={13} strokeWidth={isActive ? 2.5 : 1.8} /> : null}
                        </div>
                        <span style={{ flex: 1 }}>{cmd.label}</span>
                        {cmd.hint && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-dim)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {cmd.hint}
                          </span>
                        )}
                        {isActive && (
                          <div
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "var(--accent)",
                              boxShadow: "0 0 10px var(--accent-glow)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "9px 14px",
                fontSize: 11,
                color: "var(--text-dim)",
                display: "flex",
                alignItems: "center",
                gap: 14,
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                background: "rgba(0, 0, 0, 0.14)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <ArrowUp size={11} />
                <ArrowDown size={11} />
                {t("cmdNav")}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <CornerDownLeft size={11} />
                {t("cmdExecute")}
              </span>
              <span style={{ marginLeft: "auto" }}>{t("cmdCount").replace("{n}", filtered.length.toString())}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
