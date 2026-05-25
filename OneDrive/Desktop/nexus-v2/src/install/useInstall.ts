import { useCallback, useEffect, useRef, useState } from "react";
import { realTauri } from "../api/tauri";
import type { GitHubAsset, ProfileInfo, Settings } from "../api/tauri";

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

function isCargoFix(name: string): boolean {
  return name.toLowerCase().startsWith("cargofix");
}

async function findProfileSii(dir: string): Promise<string | null> {
  // Rust's find_file_in_dir handles recursive search inside apply_profile_mods
  // Frontend just returns the primary candidate — Rust finds it
  return `${dir}\\profile.sii`;
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

    setProgress({
      ...initialProgress,
      phase: "init",
      totalCount: assets.length,
      currentFile: "Подготовка…",
    });

    const tempDir = "C:\\Users\\Public\\AppData\\Local\\Temp\\nexus";

    // Split assets by type
    const modsAssets = assets.filter(
      (a) => classify(a.name) !== "dlc" && classify(a.name) !== "profile"
    );
    const profileAssets = assets.filter((a) => classify(a.name) === "profile");

    try {
      // Phase: mods (.scs, .7z, .zip, CargoFix)
      if (modsAssets.length > 0) {
        setProgress((p) => ({
          ...p,
          phase: "mods",
          steps: { ...p.steps, mods: "active" },
          totalCount: modsAssets.length + profileAssets.length,
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
          const tempFile = `${tempDir}\\${asset.name}`;

          setProgress((p) => ({
            ...p,
            currentFile: asset.name,
            currentIndex: i + 1,
            currentBytes: 0,
            currentTotalBytes: asset.size,
            speed: "0 MB/s",
          }));

          try {
            await logInstall(`[start] downloading ${asset.name} url=${asset.download_url || asset.browser_download_url} dest=${tempFile}`);
            const dlUrl = asset.download_url || asset.browser_download_url;
            if (!dlUrl) throw new Error(`No download URL for ${asset.name}`);
            await realTauri.download_with_progress(dlUrl, tempFile, settings.github_token);
            if (cancelRef.current) return finishCancelled();

            if (lower.endsWith(".scs")) {
              // .scs — копировать в mods без изменений
              await realTauri.copy_to_mods(tempFile, settings.mods_path);
            } else if (lower.endsWith(".7z")) {
              // .7z — распаковать в mods
              await realTauri.extract_archive(tempFile, settings.mods_path);
            } else if (isCargoFix(asset.name)) {
              // CargoFix.zip — копировать БЕЗ распаковки в mods
              await realTauri.copy_to_mods(tempFile, settings.mods_path);
            } else if (lower.endsWith(".zip")) {
              // .zip моды — распаковать в mods
              await realTauri.extract_archive(tempFile, settings.mods_path);
            } else {
              // Прочие — копировать
              await realTauri.copy_to_mods(tempFile, settings.mods_path);
            }

            setProgress((p) => ({
              ...p,
              currentBytes: asset.size,
              speed: "Готово",
              stats: { ...p.stats, installed: p.stats.installed + 1 },
            }));
          } catch (e: any) {
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

      // Phase: reference profile
      const relevantProfile = profileAssets.find((a) => {
        const n = a.name.toLowerCase();
        return buildType === "solo" ? n.includes("solo") : !n.includes("solo");
      });

      if (relevantProfile) {
        setProgress((p) => ({
          ...p,
          phase: "profile",
          currentFile: relevantProfile.name,
          steps: { ...p.steps, mods: "done", profile: "active" },
        }));

        const tempFile = `${tempDir}\\${relevantProfile.name}`;
        const refExtractDir = `${tempDir}\\ref_extract`;

        try {
          const profileDlUrl = relevantProfile.download_url || relevantProfile.browser_download_url;
          if (!profileDlUrl) throw new Error(`No download URL for profile ${relevantProfile.name}`);
          await realTauri.download_with_progress(profileDlUrl, tempFile, settings.github_token);
          if (cancelRef.current) return finishCancelled();

          await realTauri.extract_archive(tempFile, refExtractDir);

          // Use selected profile's sii_path (works for both local and steam_cloud)
          const userProfilePath = selectedProfile?.sii_path ?? `${settings.profile_path}\\profile_data.sii`;

          // apply_profile_mods in Rust will find profile.sii inside refExtractDir
          await realTauri.apply_profile_mods(refExtractDir, userProfilePath);

          setProgress((p) => ({
            ...p,
            speed: "Готово",
            stats: { ...p.stats, installed: p.stats.installed + 1 },
          }));
        } catch (e) {
          setProgress((p) => ({
            ...p,
            stats: { ...p.stats, errors: p.stats.errors + 1 },
          }));
        }
      }

      if (cancelRef.current) return finishCancelled();

      // Cleanup
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

    setProgress({
      ...initialProgress,
      phase: "dlc",
      steps: { mods: "wait", dlc: "active", profile: "wait", cleanup: "wait" },
      totalCount: assets.length,
      currentFile: "Установка DLC…",
    });

    const tempDir = "C:\\Users\\Public\\AppData\\Local\\Temp\\nexus\\dlc";

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
        await realTauri.download_with_progress(dlcDlUrl, tempFile, undefined);
        // extract_dlc распаковывает def/locale/material в корень игры
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

  const pause = useCallback(() => { pauseRef.current = true; setIsPaused(true); }, []);
  const resume = useCallback(() => { pauseRef.current = false; setIsPaused(false); }, []);
  const skip = useCallback(() => { skipRef.current = true; }, []);
  const cancel = useCallback(() => {
    cancelRef.current = true;
    pauseRef.current = false;
    skipRef.current = false;
    setIsPaused(false);
  }, []);
  const close = useCallback(() => {
    setViewMode("hidden");
    setProgress(initialProgress);
    cancelRef.current = false;
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
