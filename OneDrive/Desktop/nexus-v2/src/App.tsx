import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
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
import { LogsPage } from "./pages/LogsPage";
import { FaqPage } from "./pages/FaqPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsProvider, useNotifications } from "./context/NotificationsContext";
import { LogsProvider } from "./context/LogsContext";
import { useInstall } from "./install/useInstall";
import { InstallFab } from "./install/InstallFab";
import { MissionControl } from "./install/MissionControl";
import { PreInstallDialog } from "./install/PreInstallDialog";
import { IS_TAURI, realTauri, type GitHubRelease, type ProfileInfo } from "./api/tauri";
import { useToast } from "./components/Toast";
import { ModeProvider } from "./context/ModeContext";
import { I18nProvider, useI18n } from "./context/I18nContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

export type Section =
  | "home"
  | "profiles"
  | "graphics"
  | "optimize"
  | "tools"
  | "backups"
  | "logs"
  | "faq"
  | "settings"
  | "notifications"
  | "login";

// Enhanced page transitions with blur+scale+slide
function getPageTransition(section: Section) {
  const base = { duration: 0.32, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  // Heavy pages get deep blur+scale+fade
  if (["logs", "logAnalyzer", "backups", "profiles"].includes(section)) {
    return {
      initial: { opacity: 0, y: 20, scale: 0.95, filter: "blur(6px)" },
      animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
      exit: { opacity: 0, y: -12, scale: 0.96, filter: "blur(5px)" },
      transition: { ...base, type: "spring" as const, stiffness: 160, damping: 20 },
    };
  }

  // Settings/tools get horizontal slide with scale
  if (["settings", "tools", "optimize", "graphics"].includes(section)) {
    return {
      initial: { opacity: 0, x: 32, scale: 0.97, filter: "blur(4px)" },
      animate: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
      exit: { opacity: 0, x: -24, scale: 0.97, filter: "blur(4px)" },
      transition: { ...base, type: "spring" as const, stiffness: 180, damping: 22 },
    };
  }

  // Home — classic fade+slide with subtle upward drift
  return {
    initial: { opacity: 0, y: 16, scale: 0.98, filter: "blur(3px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, y: -8, scale: 0.98, filter: "blur(3px)" },
    transition: { ...base, type: "spring" as const, stiffness: 200, damping: 20 },
  };
}

// Ambient background with drifting orbs, grid, and scanlines
function AmbientBackground() {
  return (
    <>
      <div className="ambient-bg">
        <div className="ambient-orb ambient-orb-teal orb-1" />
        <div className="ambient-orb ambient-orb-purple orb-2" />
        <div className="ambient-orb ambient-orb-blue orb-3" />
        <div className="ambient-orb ambient-orb-teal orb-4" />
      </div>
      {/* Subtle grid overlay */}
      <div className="grid-overlay" />
      {/* Subtle scanlines */}
      <div className="scanlines-overlay" />
    </>
  );
}



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
  const { user, logout, isLoading, checkSubscription } = useAuth();
  const { add: addNotification } = useNotifications();

  // When user logs in successfully, redirect to home
  const handleLoginSuccess = () => {
    setSection("home");
  };

  // When user logs out, go to login
  const handleLogout = () => {
    logout();
    setSection("login");
  };

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
  const requestInstall = async () => {
    if (!settings.loaded) {
      toast.push("Настройки ещё загружаются…", { variant: "warn" });
      return;
    }

    // Проверка подписки перед установкой
    const subscribed = await checkSubscription();
    if (!subscribed) {
      logout();
      toast.push("Подписка на канал не подтверждена. Войдите заново.", { variant: "error" });
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

  // Проверка обновлений лаунчера
  useEffect(() => {
    if (!splashDone || !user) return;
    if (!settings.data?.background_updater) return;

    realTauri.check_launcher_update().then((result) => {
      if (result?.available && result.url) {
        addNotification({
          type: "info",
          title: "Доступна новая версия NEXUS",
          body: `Версия ${result.version} готова к установке.`,
          action: () => {
            realTauri.download_and_run_update(result.url!).catch(() => {});
          },
        });
      }
    }).catch(() => {});
  }, [splashDone, user]);

  // Cmd/Ctrl+K + Ctrl+/- масштаб
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        settings.update("ui_scale", 1.0);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        settings.update("ui_scale", 0.8);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settings]);

  // Listen for tray menu navigation
  useEffect(() => {
    const unlisten = listen<string>("navigate-section", (event) => {
      setSection(event.payload as Section);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // Listen for check-updates from tray
  useEffect(() => {
    const unlisten = listen("check-updates", () => {
      // Trigger update check — emit to SettingsPage or HomePage
      // For now, navigate to settings where update check lives
      setSection("settings");
    });
    return () => { unlisten.then(fn => fn()); };
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

  // Show loading if auth is still loading
  if (isLoading || !splashDone) {
    return <AnimatePresence>{!splashDone && <SplashScreen />}</AnimatePresence>;
  }

  // Not logged in → show only login, full screen
  if (!user) {
    return (
      <>
        <AnimatePresence>
          <motion.div
            key="login-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ width: "100vw", height: "100vh", background: "var(--bg-primary)" }}
          >
            <LoginPage onSuccess={handleLoginSuccess} />
          </motion.div>
        </AnimatePresence>
        <div className="vignette" />
      </>
    );
  }

  // Logged in → full app
  return (
    <>
      <AmbientBackground />
      <div className="vignette" />
      <div className="noise-overlay" />
      <div style={{ position: "relative", zIndex: 1, zoom: scale }}>
        <div className="app-root">
          <Sidebar active={section} onSelect={setSection} user={user} />
          <div className="content-area">
            <TopBar section={section} onSearchClick={() => setPaletteOpen(true)} />

            <main className="page-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={section}
                  style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%", height: "100%", boxSizing: "border-box" }}
                  initial={getPageTransition(section).initial}
                  animate={getPageTransition(section).animate}
                  exit={getPageTransition(section).exit}
                  transition={getPageTransition(section).transition}
                >
                  {section === "home" && <HomePage goto={setSection} onStartInstall={requestInstall} onGotoFaq={() => setSection("faq")} gameStartTime={gameStartTime} />}
                  {section === "profiles" && <ProfilesPage />}
                  {section === "graphics" && <GraphicsPage />}
                  {section === "optimize" && <OptimizePage />}
                  {section === "tools" && <ToolsPage />}
                  {section === "backups" && <BackupsPage />}
                  {section === "logs" && <LogsPage />}
                  {section === "faq" && <FaqPage />}
                  {section === "settings" && <SettingsPage />}
                  {section === "notifications" && <NotificationsPage />}
                  {section === "login" && <LoginPage onSuccess={handleLoginSuccess} />}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>

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
        <SettingsProvider>
          <AuthProvider>
            <NotificationsProvider>
              <LogsProvider>
                <AppContent />
              </LogsProvider>
            </NotificationsProvider>
          </AuthProvider>
        </SettingsProvider>
      </ModeProvider>
    </I18nProvider>
  );
}
