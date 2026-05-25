import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { SplashScreen } from "./components/SplashScreen";
import { CommandPalette, buildDefaultCommands } from "./components/CommandPalette";
import { HomePage } from "./pages/HomePage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { GraphicsPage } from "./pages/GraphicsPage";
import { OptimizePage } from "./pages/OptimizePage";
import { ToolsPage } from "./pages/ToolsPage";
import { BackupsPage } from "./pages/BackupsPage";
import { LogAnalyzerPage } from "./pages/LogAnalyzerPage";
import { FaqPage } from "./pages/FaqPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useInstall } from "./install/useInstall";
import { InstallFab } from "./install/InstallFab";
import { MissionControl } from "./install/MissionControl";
import { PreInstallDialog } from "./install/PreInstallDialog";
import { useSettings } from "./store/useSettings";
import { IS_TAURI, realTauri, type GitHubRelease, type ProfileInfo } from "./api/tauri";
import { useToast } from "./components/Toast";
import { ModeProvider } from "./context/ModeContext";
import { I18nProvider, useI18n } from "./context/I18nContext";

export type Section =
  | "home"
  | "profiles"
  | "graphics"
  | "optimize"
  | "tools"
  | "backups"
  | "logs"
  | "faq"
  | "settings";

function AppContent() {
  const [splashDone, setSplashDone] = useState(false);
  const [section, setSection] = useState<Section>("home");
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [preInstallOpen, setPreInstallOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileInfo | null>(null);
  const toast = useToast();
  const install = useInstall();
  const settings = useSettings();
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const t = useI18n();

  useEffect(() => {
    if (!settings.data) return;

    const s = settings.data;

    // game_path/mods_path/profile_path: Rust migrate_paths сам авто-детектит и заполняет.
    // Здесь делать ничего не нужно — get_settings возвращает уже валидные пути.

    // Load manifest — читаем свежие настройки чтобы получить актуальный токен
    if (!s.github_owner || !s.github_repo || !s.github_tag) {
      return;
    }
    setManifestError(null);
    realTauri.get_settings().then((freshSettings) => {
      realTauri.fetch_release(s.github_owner, s.github_repo, s.github_tag, freshSettings.github_token || undefined)
        .then((r) => { setRelease(r); setManifestError(null); })
        .catch((e: unknown) => { setManifestError(String(e)); });
    }).catch((e: unknown) => {
      setManifestError(String(e));
    });
  }, [settings.data]);

  // Entry point: gather paths first if not configured, otherwise go straight to install
  const requestInstall = () => {
    if (!settings.loaded) {
      toast.push("Настройки ещё загружаются…", { variant: "warn" });
      return;
    }
    const s = settings.data;
    if (!s?.github_owner || !s?.github_repo || !s?.github_tag) {
      toast.push("GitHub не настроен. Откройте Настройки.", { variant: "error" });
      return;
    }
    if (manifestError) {
      toast.push(`Ошибка загрузки манифеста: ${manifestError}`, { variant: "error" });
      return;
    }
    if (!release) {
      toast.push("Ещё загружается манифест GitHub…", { variant: "warn" });
      return;
    }
    setPreInstallOpen(true);
  };

  // PreInstallDialog confirms → actually start install
  const onPreInstallConfirm = () => {
    setPreInstallOpen(false);
    if (!release) return;
    install.startInstall(release.assets, settings.data!, settings.data!.build_type as "convoy" | "solo", selectedProfile ?? undefined);
  };

  useEffect(() => {
    const timeout = setTimeout(() => setSplashDone(true), 2200);
    return () => clearTimeout(timeout);
  }, []);

  // Welcome toast
  useEffect(() => {
    if (!splashDone) return;
    if (!IS_TAURI) {
      toast.push("Демо-режим: данные подставлены через моки. Запусти `npm run tauri:dev` для реальных вызовов.", { variant: "info", duration: 6000 });
    } else {
      toast.push("Nexus v2 готов к работе", { variant: "success", duration: 2400 });
    }
  }, [splashDone]);

  // Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function launchGame() {
    setGameStartTime(Date.now());
    realTauri.launch_game(settings.data?.game_path ?? "").catch(() => {});
    toast.push(t("launchingGame"));
  }

  const commands = buildDefaultCommands({
    goto: setSection,
    startInstall: requestInstall,
    openSettings: () => setSection("settings"),
    launchGame,
    t,
  });

  const scale = Number(settings.data?.ui_scale) || 1.0;
  console.log("[DEBUG] ui_scale:", settings.data?.ui_scale, "scale:", scale);

  return (
    <>
      <AnimatePresence>{!splashDone && <SplashScreen />}</AnimatePresence>

      <div className="app-root" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
      <Sidebar active={section} onSelect={setSection} />
      <TopBar section={section} onSearchClick={() => setPaletteOpen(true)} />

      <main style={{ gridArea: "main", overflow: "auto", position: "relative" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {section === "home" && <HomePage goto={setSection} onStartInstall={requestInstall} onGotoFaq={() => setSection("faq")} gameStartTime={gameStartTime} />}
            {section === "profiles" && <ProfilesPage />}
            {section === "graphics" && <GraphicsPage />}
            {section === "optimize" && <OptimizePage />}
            {section === "tools" && <ToolsPage />}
            {section === "backups" && <BackupsPage />}
            {section === "logs" && <LogAnalyzerPage />}
            {section === "faq" && <FaqPage />}
            {section === "settings" && <SettingsPage />}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      <div className="vignette" />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />

      {/* Pre-install gate */}
      <PreInstallDialog
        settings={settings}
        open={preInstallOpen}
        onClose={() => setPreInstallOpen(false)}
        onConfirm={onPreInstallConfirm}
        selectedProfile={selectedProfile}
        onProfileChange={setSelectedProfile}
      />

      {/* Install overlays */}
      <AnimatePresence>
        {install.viewMode === "overlay" && <MissionControl install={install} />}
      </AnimatePresence>
      <AnimatePresence>
        {install.viewMode === "fab" && <InstallFab install={install} />}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ModeProvider>
        <AppContent />
      </ModeProvider>
    </I18nProvider>
  );
}
