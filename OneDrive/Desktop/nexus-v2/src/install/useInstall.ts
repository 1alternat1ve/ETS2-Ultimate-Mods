import { useCallback, useEffect, useRef, useState } from "react";
import { realTauri, listen } from "../api/tauri";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { GitHubAsset, ProfileInfo, Settings } from "../api/tauri";

type DownloadProgressEvent = {
  bytes_read: number;
  total_bytes: number;
  speed_mbps: number;
};

async function logInstall(msg: string) {
  try {
    await realTauri.log_to_file(msg);
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
  startInstall: (assets: GitHubAsset[], settings: Settings, buildType: "convoy" | "solo", selectedProfile?: ProfileInfo) => void;
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
  return "mods";
}

export function useInstall(): UseInstall {
  const [progress, setProgress] = useState<InstallProgress>(initialProgress);
  const [viewMode, setViewMode] = useState<ViewMode>("hidden");
  const [isPaused, setIsPaused] = useState(false);

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

  const startInstall = useCallback(async (assets: GitHubAsset[], settings: Settings, buildType: "convoy" | "solo", selectedProfile?: ProfileInfo) => {
    if (assets.length === 0) return;

    cancelRef.current = false;
    pauseRef.current = false;
    skipRef.current = false;
    setIsPaused(false);
    setViewMode("overlay");

    await realTauri.set_download_cancelled(false).catch(() => {});
    await realTauri.set_download_paused(false).catch(() => {});

    setProgress({
      ...initialProgress,
      phase: "init",
      totalCount: assets.length,
      currentFile: "Подготовка…",
    });

    const tempDir = await realTauri.get_temp_dir();

    const modsAssets = assets.filter(
      (a) => classify(a.name) !== "dlc" && classify(a.name) !== "profile"
    );

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

    try {
      if (modsAssets.length > 0) {
        setProgress((p) => ({
          ...p,
          phase: "mods",
          steps: { ...p.steps, mods: "active" },
          totalCount: modsAssets.length,
        }));

        for (let i = 0; i < modsAssets.length; i++) {
          if (cancelRef.current) return finishCancelled();
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
          const is7z = lower.endsWith(".7z");
          // .scs и .zip — напрямую в папку модов; .7z — во временный файл, потом распаковать
          const dlDest = is7z
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

            if (is7z) {
              // .7z — распаковать в mods, затем удалить архив
              await realTauri.extract_archive(dlDest, settings.mods_path);
              await logInstall(`[cleanup] removing temp archive: ${dlDest}`);
            } else {
              // .scs и .zip — уже на месте
              await logInstall(`[done] ${asset.name} installed to mods`);
            }

            setProgress((p) => ({
              ...p,
              currentBytes: asset.size,
              speed: "Готово",
              stats: { ...p.stats, installed: p.stats.installed + 1 },
            }));
          } catch (e: any) {
            const errStr = String(e);
            if (errStr.includes("SKIPPED")) {
              await logInstall(`[skip] ${asset.name}`);
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
      }

      if (cancelRef.current) return finishCancelled();

      // Phase: DLC — fetch from ETS2-dlcunlock repo
      if (settings.dlc_owner && settings.dlc_repo && settings.dlc_tag && settings.game_path) {
        let dlcAssets: GitHubAsset[] = [];
        try {
          const dlcRelease = await realTauri.fetch_release(
            settings.dlc_owner, settings.dlc_repo, settings.dlc_tag, undefined
          );
          dlcAssets = (dlcRelease.assets || []).filter((a) => {
            const n = a.name.toLowerCase();
            return n === "dlc.zip" || n === "dlc1.zip";
          });
          await logInstall(`[dlc] found ${dlcAssets.length} DLC archives from ${settings.dlc_owner}/${settings.dlc_repo}:${settings.dlc_tag}`);
        } catch (e) {
          await logInstall(`[dlc] failed to fetch DLC release: ${e}`);
        }

        if (dlcAssets.length > 0) {
          setProgress((p) => ({
            ...p,
            phase: "dlc",
            currentFile: "Загрузка DLC…",
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
              await logInstall(`[dlc] extracted ${asset.name} to ${settings.game_path}`);

              setProgress((p) => ({
                ...p,
                currentBytes: asset.size,
                speed: "Готово",
                stats: { ...p.stats, installed: p.stats.installed + 1 },
              }));
            } catch (e: any) {
              const errStr = String(e);
              if (errStr.includes("SKIPPED")) {
                await logInstall(`[skip] ${asset.name}`);
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
        setProgress((p) => ({
          ...p,
          phase: "profile",
          currentFile: "Загрузка настроек профиля…",
          steps: { ...p.steps, mods: "done", profile: "active" },
        }));

        const profileTxtName = buildType === "solo" ? "reference_solo.txt" : "reference_convoy.txt";
        const profileTxtUrl = `https://github.com/${settings.github_owner}/${settings.github_repo}/releases/download/${settings.github_tag}/${profileTxtName}`;
        const profileTxtTemp = `${tempDir}\\${profileTxtName}`;

        try {
          await realTauri.download_with_progress(profileTxtUrl, profileTxtTemp, settings.github_token, undefined, profileTxtName);
          if (cancelRef.current) return finishCancelled();

          const referenceTxt = await readTextFile(profileTxtTemp);
          await logInstall(`[profile] loaded ${profileTxtName}, ${referenceTxt.split('\n').length} lines`);

          const userProfilePath = selectedProfile?.siiPath ?? `${settings.profile_path}\\profile_data.sii`;
          await realTauri.patch_profile_mods_from_txt(referenceTxt, userProfilePath);
          await logInstall(`[profile] patched ${userProfilePath} with mods from ${profileTxtName}`);

          setProgress((p) => ({
            ...p,
            speed: "Готово",
            stats: { ...p.stats, installed: p.stats.installed + 1 },
          }));
        } catch (e: any) {
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

      setProgress((p) => ({
        ...p,
        phase: "cleanup",
        currentFile: "Очистка…",
        steps: { ...p.steps, profile: "done", cleanup: "active" },
      }));
      await new Promise((r) => setTimeout(r, 500));

      setProgress((p) => ({
        ...p,
        phase: "complete",
        currentFile: "Готово! Перезапустите игру.",
        speed: "—",
        steps: { ...p.steps, cleanup: "done" },
      }));
    } catch (e) {
      setProgress((p) => ({
        ...p,
        phase: "error",
        currentFile: `Ошибка: ${e}`,
      }));
    } finally {
      unlistenProgress();
    }
  }, [finishCancelled]);

  // DLC install — from ETS2-dlcunlock repo
  const startDlcInstall = useCallback(async (assets: GitHubAsset[], gamePath: string) => {
    if (assets.length === 0 || !gamePath) return;

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
    realTauri.set_download_skip().catch(() => {});
  }, []);
  const cancel = useCallback(() => {
    cancelRef.current = true;
    pauseRef.current = false;
    skipRef.current = false;
    setIsPaused(false);
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
