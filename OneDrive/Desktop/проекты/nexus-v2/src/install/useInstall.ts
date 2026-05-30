import { useCallback, useEffect, useRef, useState } from "react";
import { realTauri, listen } from "../api/tauri";
import type { GitHubAsset, ProfileInfo, Settings } from "../api/tauri";
import { useMode } from "../context/ModeContext";
import { useNotifications } from "../context/NotificationsContext";
import { useLogs } from "../context/LogsContext";

type DownloadProgressEvent = {
  bytes_read: number;
  total_bytes: number;
  speed_mbps: number;
};

async function logInstall(msg: string) {
  try {
    await realTauri.log_install(msg);
  } catch (_) {}
}

export type InstallPhase =
  | "idle"
  | "init"
  | "mods"
  | "dlc"
  | "profile"
  | "cleanup"
  | "complete"
  | "error"
  | "cancelled";

export type StepStatus = "wait" | "active" | "done" | "error";

export interface InstallSteps {
  mods: StepStatus;
  dlc: StepStatus;
  profile: StepStatus;
  cleanup: StepStatus;
}

export interface InstallProgress {
  phase: InstallPhase;
  steps: InstallSteps;
  currentIndex: number;
  totalCount: number;
  currentFile: string;
  currentBytes: number;
  currentTotalBytes: number;
  speed: string;
  stats: { installed: number; skipped: number; errors: number };
}

const initialProgress: InstallProgress = {
  phase: "idle",
  steps: { mods: "wait", dlc: "wait", profile: "wait", cleanup: "wait" },
  currentIndex: 0,
  totalCount: 0,
  currentFile: "",
  currentBytes: 0,
  currentTotalBytes: 0,
  speed: "—",
  stats: { installed: 0, skipped: 0, errors: 0 },
};

export type ViewMode = "overlay" | "fab" | "hidden";

export interface UseInstall {
  progress: InstallProgress;
  viewMode: ViewMode;
  isActive: boolean;
  isPaused: boolean;
  startInstall: (assets: GitHubAsset[], settings: Settings, selectedProfile?: ProfileInfo) => void;
  startDlcInstall: (assets: GitHubAsset[], gamePath: string) => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  cancel: () => void;
  close: () => void;
  minimize: () => void;
  expand: () => void;
}

function classify(name: string): "profile" | "dlc" | "mods" {
  const n = name.toLowerCase();
  if (n.startsWith("reference_profile")) return "profile";
  if (n === "dlc.zip" || n === "dlc1.zip") return "dlc";
  if (n.endsWith(".txt")) return "profile";
  if (n.includes("cargofix") || n.includes("cargo fix")) return "profile";
  return "mods";
}

export function useInstall(): UseInstall {
  const [progress, setProgress] = useState<InstallProgress>(initialProgress);
  const [viewMode, setViewMode] = useState<ViewMode>("hidden");
  const [isPaused, setIsPaused] = useState(false);

  const { isDemoMode } = useMode();
  const demoModeRef = useRef(isDemoMode);
  demoModeRef.current = isDemoMode;
  const { add: addNotification } = useNotifications();
  const { add: addLog } = useLogs();
  const demoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPhaseRef = useRef<InstallPhase>("idle");

  // Trigger notifications on phase changes
  useEffect(() => {
    const phase = progress.phase;
    if (phase === prevPhaseRef.current) return;
    prevPhaseRef.current = phase;

    if (phase === "complete") {
      addNotification({ type: "success", title: "Установка завершена", body: "Все моды успешно установлены и отсортированы." });
    } else if (phase === "error") {
      addNotification({ type: "error", title: "Ошибка установки", body: "При установке произошла ошибка. Проверьте логи." });
    }
  }, [progress.phase, addNotification]);

  const cancelRef = useRef(false);
  const pauseRef = useRef(false);
  const skipRef = useRef(false);

  useEffect(() => {
    if ((progress.phase === "complete" || progress.phase === "cancelled" || progress.phase === "error") && viewMode === "fab") {
      setViewMode("overlay");
    }
  }, [progress.phase, viewMode]);

  const waitWhilePaused = async () => {
    while (pauseRef.current && !cancelRef.current) {
      await new Promise((r) => setTimeout(r, 200));
    }
  };

  const finishCancelled = useCallback(() => {
    setProgress((p) => ({
      ...p,
      phase: "cancelled",
      currentFile: "Отменено пользователем",
      speed: "—",
    }));
  }, []);

  const runDemoInstall = useCallback((totalCount: number) => {
    const phases: InstallPhase[] = ["init", "mods", "dlc", "profile", "cleanup"];
    const demoFiles = [
      "protrucks_map.scs", "promods_me.scs", "rusmap_geo.scs", "traffic_pack.scs",
      "weather_mod.scs", "lighting_fix.scs", "sound_packs.scs", "ui_theme.scs",
    ];
    const FILES_PER_PHASE = 8;
    const BYTES_PER_FILE = 15_000_000;
    const CHUNK_SIZE = 1_500_000;

    let phaseIdx = 0;
    let fileIdx = 0;
    let bytesInFile = 0;

    const tick = () => {
      if (cancelRef.current) {
        if (demoRef.current) clearTimeout(demoRef.current);
        setProgress((p) => ({
          ...p,
          phase: "cancelled",
          currentFile: "Отменено пользователем",
          speed: "—",
        }));
        return;
      }
      if (pauseRef.current) {
        demoRef.current = setTimeout(tick, 200) as unknown as ReturnType<typeof setInterval>;
        return;
      }
      if (skipRef.current) {
        skipRef.current = false;
        bytesInFile = BYTES_PER_FILE;
      }

      const phase = phases[phaseIdx];
      const currentFile = demoFiles[fileIdx % demoFiles.length];
      bytesInFile += CHUNK_SIZE + Math.floor(Math.random() * 500_000);
      const isLastFile = fileIdx >= FILES_PER_PHASE - 1 && phaseIdx === phases.length - 1;

      if (bytesInFile >= BYTES_PER_FILE || isLastFile) {
        bytesInFile = 0;
        fileIdx++;
        if (fileIdx >= FILES_PER_PHASE) {
          fileIdx = 0;
          phaseIdx++;
          if (phaseIdx >= phases.length) {
            if (demoRef.current) clearTimeout(demoRef.current);
            setProgress((p) => ({
              ...p,
              phase: "complete",
              currentFile: "Готово! Перезапустите игру.",
              speed: "—",
              steps: { mods: "done", dlc: "done", profile: "done", cleanup: "done" },
              stats: { installed: totalCount, skipped: 0, errors: 0 },
            }));
            return;
          }
        }
      }

      const speedMbps = 5 + Math.random() * 20;
      const speed = `${speedMbps.toFixed(1)} MB/s`;
      const currentBytes = Math.min(bytesInFile, BYTES_PER_FILE);

      const steps: InstallSteps = phaseIdx === 0
        ? { mods: "wait", dlc: "wait", profile: "wait", cleanup: "wait" }
        : {
            mods: phaseIdx > 1 ? "done" : phaseIdx === 1 ? "active" : "wait",
            dlc: phaseIdx > 2 ? "done" : phaseIdx === 2 ? "active" : "wait",
            profile: phaseIdx > 3 ? "done" : phaseIdx === 3 ? "active" : "wait",
            cleanup: phaseIdx === 4 ? "active" : "wait",
          };

      setProgress((p) => ({
        ...p,
        phase,
        currentFile,
        currentIndex: phaseIdx * FILES_PER_PHASE + fileIdx + 1,
        totalCount: phases.length * FILES_PER_PHASE,
        currentBytes,
        currentTotalBytes: BYTES_PER_FILE,
        speed,
        steps,
      }));

      if (phaseIdx < phases.length) {
        demoRef.current = setTimeout(tick, 80 + Math.random() * 40) as unknown as ReturnType<typeof setInterval>;
      }
    };

    demoRef.current = setTimeout(tick, 100) as unknown as ReturnType<typeof setInterval>;
  }, []);

  const startInstall = useCallback(async (assets: GitHubAsset[], settings: Settings, selectedProfile?: ProfileInfo) => {
    if (assets.length === 0) return;

    const demoMode = demoModeRef.current;

    // Очищаем лог установки перед новой
    realTauri.clear_install_log().catch(() => {});

    cancelRef.current = false;
    pauseRef.current = false;
    skipRef.current = false;
    setIsPaused(false);
    setViewMode("overlay");

    setProgress({
      ...initialProgress,
      phase: "init",
      totalCount: assets.length,
      currentFile: "Подготовка…",
    });

    await logInstall("═══ NEXUS — установка сборки ═══");
addLog("info", "Install", "Начало установки");

    if (demoMode) {
      setProgress({
        ...initialProgress,
        phase: "init",
        totalCount: assets.length,
        currentFile: "DEMO",
      });
      runDemoInstall(assets.length);
      return;
    }

    await realTauri.set_download_cancelled(false).catch(() => {});
    await realTauri.set_download_paused(false).catch(() => {});

    const tempDir = await realTauri.get_temp_dir();

    const modsAssets = assets.filter(
      (a) => classify(a.name) !== "dlc" && classify(a.name) !== "profile"
    );

    const unlistenExtract = await listen<{ processed: number; total: number; current_file: string }>("extract-progress", (data) => {
      setProgress((p) => ({
        ...p,
        currentBytes: data.processed,
        currentTotalBytes: data.total,
        currentFile: data.current_file || p.currentFile,
        speed: "Распаковка…",
      }));
    });

    const unlistenProgress = await listen<DownloadProgressEvent>("download-progress", (data) => {
      const speed = data.speed_mbps >= 1
        ? `${data.speed_mbps.toFixed(2)} MB/s`
        : `${(data.speed_mbps * 1024).toFixed(0)} KB/s`;
      setProgress((p) => ({
        ...p,
        currentBytes: data.bytes_read,
        currentTotalBytes: data.total_bytes > 0 ? data.total_bytes : p.currentTotalBytes,
        speed,
      }));
    });

    // Track archive files to clean up after extraction
    const archivesToClean: string[] = [];

    try {
      if (modsAssets.length > 0) {
        setProgress((p) => ({
          ...p,
          phase: "mods",
          steps: { ...p.steps, mods: "active" },
          totalCount: modsAssets.length,
        }));
        await logInstall("\n── Моды ──");
        addLog("info", "Install", "Фаза: mods");

        for (let i = 0; i < modsAssets.length; i++) {
          if (cancelRef.current) { return finishCancelled(); }
          await waitWhilePaused();
          if (cancelRef.current || skipRef.current) {
            skipRef.current = false;
            setProgress((p) => ({
              ...p,
              currentIndex: i + 1,
              stats: { ...p.stats, skipped: p.stats.skipped + 1 },
            }));
            continue;
          }

          const asset = modsAssets[i];
          const lower = asset.name.toLowerCase();
          const isArchive = lower.endsWith(".7z") || lower.endsWith(".rar");
          const dlDest = isArchive
            ? `${tempDir}\\${asset.name}`
            : `${settings.mods_path}\\${asset.name}`;

          setProgress((p) => ({
            ...p,
            currentFile: asset.name,
            currentIndex: i + 1,
            currentBytes: 0,
            currentTotalBytes: asset.size,
            speed: "0 MB/s",
          }));

          try {
            const dlUrl = asset.download_url || asset.browser_download_url;
            if (!dlUrl) throw new Error(`No download URL for ${asset.name}`);
            await realTauri.download_with_progress(dlUrl, dlDest, settings.github_token, asset.updated_at, asset.name);
            if (cancelRef.current) return finishCancelled();

            if (isArchive) {
              // Extract archive to mods folder
              addLog("info", "Install", `Распаковка: ${asset.name}`);
              setProgress((p) => ({ ...p, speed: "Распаковка…", currentBytes: 0 }));
              await realTauri.extract_archive(dlDest, settings.mods_path);
              await logInstall(`  ✓ ${asset.name} — распакован в mods`);
              // Delete the archive after successful extraction
              archivesToClean.push(dlDest);
            } else {
              await logInstall(`  ✓ ${asset.name} — скачан`);
            }

            setProgress((p) => ({
              ...p,
              currentBytes: asset.size,
              speed: "Готово",
              stats: { ...p.stats, installed: p.stats.installed + 1 },
            }));
          } catch (e: unknown) {
            const errStr = String(e);
            if (errStr.includes("SKIPPED")) {
              await logInstall(`  ⊘ ${asset.name} — пропущен`);
              setProgress((p) => ({
                ...p,
                stats: { ...p.stats, skipped: p.stats.skipped + 1 },
              }));
              skipRef.current = false;
              continue;
            }
            if (errStr.includes("CANCELLED")) {
              return finishCancelled();
            }
            const msg = `ERROR: ${asset.name} -> ${e}`;
            console.error("[install]", msg);
            await logInstall(msg);
            setProgress((p) => ({
              ...p,
              currentFile: msg,
              stats: { ...p.stats, errors: p.stats.errors + 1 },
            }));
          }
        }

        // Clean up all extracted archives from temp
        for (const archivePath of archivesToClean) {
          try {
            const { remove } = await import("@tauri-apps/plugin-fs");
            await remove(archivePath);
          } catch (_) {}
        }
        addLog("info", "Install", "Все моды скачаны и распакованы");
      }

      if (cancelRef.current) return finishCancelled();

      // Phase: DLC — fetch from ETS2-dlcunlock repo
      if (settings.dlc_owner && settings.dlc_repo && settings.dlc_tag && settings.game_path) {
        let dlcAssets: GitHubAsset[] = [];
        try {
          const dlcRelease = await realTauri.fetch_release(
            settings.dlc_owner, settings.dlc_repo, settings.dlc_tag, undefined
          );
          dlcAssets = (dlcRelease.assets || []).filter((a: { name: string }) => {
            const n = a.name.toLowerCase();
            return n === "dlc.zip" || n === "dlc1.zip";
          });
          await logInstall(`  Найдено DLC: ${dlcAssets.length} архив(ов)`);
        } catch (e) {
          await logInstall(`  ✗ Не удалось загрузить DLC: ${e}`);
          addLog("error", "Install", `Ошибка загрузки DLC: ${e}`);
        }

        if (dlcAssets.length > 0) {
          await logInstall("\n── DLC ──");
          addLog("info", "Install", "Фаза: dlc");
          setProgress((p) => ({
            ...p,
            phase: "dlc",
            currentFile: "Загрузка DLC…",
            totalCount: dlcAssets.length,
            steps: { ...p.steps, mods: "done", dlc: "active" },
          }));

          const dlcTempDir = `${tempDir}\\dlc`;

          for (let i = 0; i < dlcAssets.length; i++) {
            if (cancelRef.current) return finishCancelled();
            await waitWhilePaused();
            if (cancelRef.current || skipRef.current) {
              skipRef.current = false;
              setProgress((p) => ({
                ...p,
                currentIndex: i + 1,
                totalCount: dlcAssets.length,
                stats: { ...p.stats, skipped: p.stats.skipped + 1 },
              }));
              continue;
            }

            const asset = dlcAssets[i];
            const tempFile = `${dlcTempDir}\\${asset.name}`;

            setProgress((p) => ({
              ...p,
              currentFile: asset.name,
              currentIndex: i + 1,
              totalCount: dlcAssets.length,
              currentBytes: 0,
              currentTotalBytes: asset.size,
              speed: "0 MB/s",
            }));

            try {
              const dlUrl = asset.download_url || asset.browser_download_url;
              if (!dlUrl) throw new Error(`No download URL for DLC ${asset.name}`);
              await realTauri.download_with_progress(dlUrl, tempFile, undefined, asset.updated_at, asset.name);
              if (cancelRef.current) return finishCancelled();

              await realTauri.extract_dlc(tempFile, settings.game_path);
              await logInstall(`  ✓ ${asset.name} — DLC распакован`);

              setProgress((p) => ({
                ...p,
                currentBytes: asset.size,
                speed: "Готово",
                stats: { ...p.stats, installed: p.stats.installed + 1 },
              }));
            } catch (e: unknown) {
              const errStr = String(e);
              if (errStr.includes("SKIPPED")) {
                await logInstall(`  ⊘ ${asset.name} — пропущен`);
                setProgress((p) => ({
                  ...p,
                  stats: { ...p.stats, skipped: p.stats.skipped + 1 },
                }));
                skipRef.current = false;
                continue;
              }
              if (errStr.includes("CANCELLED")) return finishCancelled();
              const msg = `ERROR DLC: ${asset.name} -> ${e}`;
              console.error("[install dlc]", msg);
              await logInstall(msg);
              setProgress((p) => ({
                ...p,
                currentFile: msg,
                stats: { ...p.stats, errors: p.stats.errors + 1 },
              }));
            }
          }
        }
      }

      if (cancelRef.current) return finishCancelled();

      // Phase: Profile — скачиваем reference txt с GitHub и патчим профиль
      {
        await logInstall("\n── Профиль ──");
        addLog("info", "Install", "Фаза: profile");
        setProgress((p) => ({
          ...p,
          phase: "profile",
          currentIndex: 0,
          totalCount: 0,
          currentFile: "Загрузка настроек профиля…",
          steps: { ...p.steps, mods: "done", dlc: "done", profile: "active" },
        }));

        const profileTxtName = "reference_profile.txt";
        const profileTxtUrl = `https://github.com/${settings.github_owner}/${settings.github_repo}/releases/download/${settings.github_tag}/${profileTxtName}`;
        const profileTxtTemp = `${tempDir}\\${profileTxtName}`;

        try {
          await realTauri.download_with_progress(profileTxtUrl, profileTxtTemp, settings.github_token, undefined, profileTxtName);
          if (cancelRef.current) return finishCancelled();

          const referenceTxt = await realTauri.read_file_raw(profileTxtTemp);
          await logInstall(`  ✓ reference_profile.txt загружен (${referenceTxt.split('\n').length} строк)`);

          const userProfilePath = selectedProfile?.siiPath ?? `${settings.profile_path}\\profile_data.sii`;
          await realTauri.patch_profile_mods_from_txt(referenceTxt, userProfilePath);
          await logInstall(`  ✓ Порядок модов применён к профилю`);

          setProgress((p) => ({
            ...p,
            speed: "Готово",
            stats: { ...p.stats, installed: p.stats.installed + 1 },
          }));
        } catch (e: unknown) {
          const errStr = String(e);
          if (errStr.includes("CANCELLED")) return finishCancelled();
          const msg = `ERROR profile: ${e}`;
          console.error("[install profile]", msg);
          await logInstall(msg);
          setProgress((p) => ({
            ...p,
            stats: { ...p.stats, errors: p.stats.errors + 1 },
          }));
        }
      }

      if (cancelRef.current) return finishCancelled();

      await logInstall("\n── Завершение ──");
      addLog("info", "Install", "Фаза: cleanup");
      setProgress((p) => ({
        ...p,
        phase: "cleanup",
        currentIndex: 0,
        totalCount: 0,
        currentFile: "Настройка конфига…",
        steps: { ...p.steps, profile: "done", cleanup: "active" },
      }));
      await new Promise((r) => setTimeout(r, 500));

      // Устанавливаем g_max_convoy_size = 128
      await realTauri.set_convoy_size().catch(() => {});
      await logInstall("  ✓ g_max_convoy_size = 128");

      await logInstall("\n═══ Установка завершена ═══");
      addLog("success", "Install", "Установка завершена");
      setProgress((p) => ({
        ...p,
        phase: "complete",
        currentFile: "Готово! Перезапустите игру.",
        speed: "—",
        steps: { ...p.steps, cleanup: "done" },
      }));
    } catch (e) {
      addLog("error", "Install", `Ошибка: ${e}`);
      setProgress((p) => ({
        ...p,
        phase: "error",
        currentFile: `Ошибка: ${e}`,
      }));
    } finally {
      unlistenProgress();
      unlistenExtract();
      // Clean up temp directory after install completes/cancels/errors
      try {
        const { remove } = await import("@tauri-apps/plugin-fs");
        await remove(tempDir, { recursive: true });
        await logInstall("  ✓ Временные файлы очищены");
      } catch (_) {}
    }
  }, [finishCancelled, addLog]);

  // DLC install — from ETS2-dlcunlock repo
  const startDlcInstall = useCallback(async (assets: GitHubAsset[], gamePath: string) => {
    if (assets.length === 0 || !gamePath) return;

    const demoMode = demoModeRef.current;
    if (demoMode) {
      setViewMode("overlay");
      setProgress({
        ...initialProgress,
        phase: "dlc",
        steps: { mods: "wait", dlc: "active", profile: "wait", cleanup: "wait" },
        totalCount: assets.length,
        currentFile: "DEMO",
      });
      runDemoInstall(assets.length);
      return;
    }

    cancelRef.current = false;
    pauseRef.current = false;
    skipRef.current = false;
    setIsPaused(false);
    setViewMode("overlay");

    await realTauri.set_download_cancelled(false).catch(() => {});
    await realTauri.set_download_paused(false).catch(() => {});

    setProgress({
      ...initialProgress,
      phase: "dlc",
      steps: { mods: "wait", dlc: "active", profile: "wait", cleanup: "wait" },
      totalCount: assets.length,
      currentFile: "Установка DLC…",
    });

    const baseTemp = await realTauri.get_temp_dir();
    const tempDir = `${baseTemp}\\dlc`;

    try {
      for (let i = 0; i < assets.length; i++) {
        if (cancelRef.current) return finishCancelled();
        await waitWhilePaused();

        const asset = assets[i];
        const tempFile = `${tempDir}\\${asset.name}`;

        setProgress((p) => ({
          ...p,
          currentFile: asset.name,
          currentIndex: i + 1,
          currentBytes: 0,
          currentTotalBytes: asset.size,
          speed: "0 MB/s",
        }));

        const dlcDlUrl = asset.download_url || asset.browser_download_url;
        if (!dlcDlUrl) throw new Error(`No download URL for DLC ${asset.name}`);
        await realTauri.download_with_progress(dlcDlUrl, tempFile, undefined, asset.updated_at, asset.name);
        await realTauri.extract_dlc(tempFile, gamePath);

        setProgress((p) => ({
          ...p,
          currentBytes: asset.size,
          speed: "Готово",
          stats: { ...p.stats, installed: p.stats.installed + 1 },
        }));
      }

      setProgress((p) => ({
        ...p,
        phase: "complete",
        currentFile: "DLC установлен! Перезапустите игру.",
        speed: "—",
        steps: { ...p.steps, dlc: "done" },
      }));
    } catch (e) {
      setProgress((p) => ({
        ...p,
        phase: "error",
        currentFile: `Ошибка: ${e}`,
      }));
    }
  }, [finishCancelled]);

  const pause = useCallback(() => {
    pauseRef.current = true;
    setIsPaused(true);
    realTauri.set_download_paused(true).catch(() => {});
  }, []);
  const resume = useCallback(() => {
    pauseRef.current = false;
    setIsPaused(false);
    realTauri.set_download_paused(false).catch(() => {});
  }, []);
  const skip = useCallback(() => {
    skipRef.current = true;
    setProgress((p) => ({ ...p, stats: { ...p.stats, skipped: p.stats.skipped + 1 } }));
    realTauri.set_download_skip().catch(() => {});
  }, []);
  const cancel = useCallback(() => {
    cancelRef.current = true;
    pauseRef.current = false;
    skipRef.current = false;
    setIsPaused(false);
    if (demoRef.current) clearTimeout(demoRef.current);
    setProgress((p) => ({
      ...p,
      phase: "cancelled",
      currentFile: "Отменено пользователем",
      speed: "—",
    }));
    realTauri.set_download_cancelled(true).catch(() => {});
  }, []);
  const close = useCallback(() => {
    setViewMode("hidden");
    setProgress(initialProgress);
    cancelRef.current = false;
    realTauri.set_download_cancelled(false).catch(() => {});
    realTauri.set_download_paused(false).catch(() => {});
  }, []);
  const minimize = useCallback(() => setViewMode("fab"), []);
  const expand = useCallback(() => setViewMode("overlay"), []);

  const isActive = progress.phase !== "idle" && viewMode !== "hidden";

  return {
    progress,
    viewMode,
    isActive,
    isPaused,
    startInstall,
    startDlcInstall,
    pause,
    resume,
    skip,
    cancel,
    close,
    minimize,
    expand,
  };
}
