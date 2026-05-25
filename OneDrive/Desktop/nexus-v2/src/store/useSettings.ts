import { useCallback, useEffect, useState } from "react";
import { invoke, realTauri, type Settings } from "../api/tauri";

async function invokeWithTimeout<T>(cmd: string, args?: Record<string, unknown>, ms = 8000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: "${cmd}" did not respond`)), ms)
  );
  return Promise.race([invoke<T>(cmd, args), timeout]) as Promise<T>;
}

const DEFAULT: Settings = {
  game_path: "",
  mods_path: "",
  profile_path: "",
  build_type: "convoy",
  theme: "premium-dark",
  language: "ru",
  ui_scale: 1.0,
  sounds_enabled: true,
  auto_backup: true,
  check_updates_on_start: true,
  background_updater: true,
  github_owner: "1alternat1ve",
  github_repo: "ETS2-Ultimate-Mods",
  github_tag: "mega",
  github_token: "",
  dlc_owner: "1alternat1ve",
  dlc_repo: "ETS2-DLCUnlock",
  dlc_tag: "dlc",
};

const STORAGE_KEY = "nexus-v2-settings";

export interface UseSettings {
  data: Settings | null;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  set: (partial: Partial<Settings>) => void;
  reset: () => void;
  isPathsConfigured: boolean;
  loaded: boolean;
}

export function useSettings(): UseSettings {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedSettings = stored ? JSON.parse(stored) : null;
        const s = await invokeWithTimeout<Settings>("get_settings");
        const next = { ...DEFAULT, ...s, ...(storedSettings || {}) };
        setSettings(next);
        document.documentElement.dataset.theme = next.theme;
      } catch (e) {
        console.error("[settings] get_settings failed:", e);
        setSettings(DEFAULT);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "theme") document.documentElement.dataset.theme = next.theme;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      realTauri.set_settings(next).catch(() => { /* noop in mock */ });
      return next;
    });
  }, []);

  const set = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (partial.theme !== undefined) document.documentElement.dataset.theme = next.theme;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      realTauri.set_settings(next).catch(() => { /* noop in mock */ });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
    setSettings(DEFAULT);
    realTauri.set_settings(DEFAULT).catch(() => {});
  }, []);

  const isPathsConfigured =
    settings.game_path.trim().length > 0 &&
    settings.mods_path.trim().length > 0 &&
    settings.profile_path.trim().length > 0;

  return { data: settings, update, set, reset, isPathsConfigured, loaded };
}
