/**
 * Tauri IPC wrapper with browser-mode fallbacks.
 * When running in `npm run dev` (plain Vite without Tauri),
 * we detect the absence of __TAURI_INTERNALS__ and return mock data
 * so the UI can be developed in a normal browser.
 */
import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export const IS_TAURI = typeof window !== "undefined" && (
  "__TAURI_INTERNALS__" in window ||
  "__TAURI__" in window ||
  window.navigator.userAgent.includes("Tauri")
);
export const IS_DEMO = false;
export const IS_PROD = true;

type Mocks = Record<string, (args?: any) => any | Promise<any>>;

const mocks: Mocks = {
  // [BROWSER-DEV FALLBACK] Settings
  get_settings: () => ({
    game_path: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Euro Truck Simulator 2",
    mods_path: "C:\\Users\\demo\\Documents\\Euro Truck Simulator 2\\mod",
    profile_path: "C:\\Users\\demo\\Documents\\Euro Truck Simulator 2\\profiles",
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
  }),

  // [BROWSER-DEV FALLBACK] GitHub release
  fetch_release: () => Promise.reject(new Error("GitHub not configured")),

  // [BROWSER-DEV FALLBACK] Game paths
  find_all_game_paths: () => Promise.resolve([
    { path: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Euro Truck Simulator 2", type: "Steam", version: "1.58.1.4" },
  ]),
  detect_hardware: () => ({
    cpu: { name: "Intel Core i7-12700K", cores: 12, threads: 20 },
    gpu: { name: "NVIDIA RTX 3070", vram_mb: 8192 },
    ram_gb: 32,
    tier: "ultra",
  }),

  // [BROWSER-DEV FALLBACK] Profiles
  list_profiles: () => [
    { id: "default", name: " Driver", location: "local", money: 1_250_000, experience: 847_392, truck: "Volvo FH16", lastModified: "2026-05-20T14:30:00Z", modsCount: 42, siiPath: "C:\\Users\\2akkv\\Documents\\Euro Truck Simulator 2\\profiles\\default\\profile_data.sii" },
    { id: "cloud_76561198012345678", name: "Pro Driver", location: "steam_cloud", money: 3_800_000, experience: 2_140_000, truck: "Scania R Streamline", lastModified: "2026-05-19T09:15:00Z", modsCount: 67, siiPath: "D:\\Steam\\userdata\\76561198012345678\\227300\\remote\\profiles\\default\\profile.sii" },
    { id: "vanilla", name: "New Game", location: "local", money: 0, experience: 0, truck: "Scania R", lastModified: "2026-05-10T18:00:00Z", modsCount: 0, siiPath: "C:\\Users\\2akkv\\Documents\\Euro Truck Simulator 2\\profiles\\vanilla\\profile_data.sii" },
  ],

  // [BROWSER-DEV FALLBACK] Mods
  scan_mods: () => ({
    maps: [
      { name: "ProMods_2.71_HD.scs", path: "C:\\mod\\ProMods_2.71_HD.scs", size_mb: 420.5, enabled: true },
      { name: "RusMap_2.50.scs", path: "C:\\mod\\RusMap_2.50.scs", size_mb: 180.2, enabled: true },
      { name: "Southern_Region.scs", path: "C:\\mod\\Southern_Region.scs", size_mb: 95.8, enabled: false },
    ],
    trucks: [
      { name: "Volvo_FH_2021.scs", path: "C:\\mod\\Volvo_FH_2021.scs", size_mb: 42.1, enabled: true },
      { name: "Scania_Truck.scs", path: "C:\\mod\\Scania_Truck.scs", size_mb: 38.7, enabled: true },
    ],
    trailers: [
      { name: "Reefer_Trailer.scs", path: "C:\\mod\\Reefer_Trailer.scs", size_mb: 15.3, enabled: true },
    ],
    sound: [
      { name: "Kriechbaum_Sound.scs", path: "C:\\mod\\Kriechbaum_Sound.scs", size_mb: 820.0, enabled: true },
    ],
    graphics: [
      { name: "Sky_Reshade.scs", path: "C:\\mod\\Sky_Reshade.scs", size_mb: 2.1, enabled: true },
    ],
    physics: [
      { name: "Realistic_Handling.scs", path: "C:\\mod\\Realistic_Handling.scs", size_mb: 1.5, enabled: true },
    ],
    other: [
      { name: "CargoFix_v3.scs", path: "C:\\mod\\CargoFix_v3.scs", size_mb: 0.3, enabled: true },
    ],
  }),
  toggle_mod: () => true,

  // [BROWSER-DEV FALLBACK] Backups
  list_backups: () => [
    { name: "Backup_2026-05-20T10-00-00.zip", size_mb: 245.3, created_at: "2026-05-20T10:00:00Z", auto: false },
    { name: "AutoBackup_2026-05-18.zip", size_mb: 238.1, created_at: "2026-05-18T08:30:00Z", auto: true },
  ],
  create_backup: () => true,
  restore_backup: () => true,
  delete_backup: () => true,

  // [BROWSER-DEV FALLBACK] Game
  get_game_version: () => "1.58.1.4",
  is_game_running: () => false,
  is_steam_running: () => true,
  launch_game: () => true,
  launch_game_safe_mode: () => true,
  close_game: () => true,
  get_free_space: (path: string) => path.includes("ETS2") ? 487 : 500,
  read_game_log: () => "[00:00:00] <i18n> Language loaded: ru_RU\n[00:00:01] <log> System info: Windows 11 Pro\n[00:00:02] <game> Euro Truck Simulator 2 started\n[00:00:05] <render> DirectX 11 initialized\n[00:00:10] <render> All shaders compiled successfully\n[00:00:15] <mod> Loading mods from profile\n[00:00:20] <mod> ProMods_2.71 loaded OK\n[00:00:22] <mod> RusMap_2.50 loaded OK\n[00:00:30] <loading> Loading world map\n[00:01:00] <game> World ready. Good luck on the roads!",

  // [BROWSER-DEV FALLBACK] GitHub token
  get_github_token: () => "",
  set_github_token: () => true,
  validate_github_token: () => ({ valid: false, rate_limit: 60, scopes: [] }),
  fetch_total_downloads: () => 12_847,

  // [BROWSER-DEV FALLBACK] Optimize
  clean_game_files: () => ({ removed: ["game.log.txt", "cache/"], freed_mb: 45.2 }),
  clean_crash_dumps: () => ({ removed: ["game.crash.txt"], freed_mb: 12.8 }),
  steam_validate: () => true,
  apply_buffer_page_fix: () => ({ created_backup: "config.cfg.bak_buffix", value: 100 }),

  // [BROWSER-DEV FALLBACK] Tools
  fix_trailer_stutter: () => ({ downloaded: "CargoFix.zip", size_mb: 4 }),
  fix_mod_order: () => "Patched with reference_convoy.txt (99 mods)",
  reset_manifest: () => true,
  scan_dlc: () => [
    { id: "dlc_east", name: "Going East!", installed: true },
    { id: "dlc_north", name: "Scandinavia", installed: true },
    { id: "dlc_fr", name: "Vive la France !", installed: false },
    { id: "dlc_it", name: "Italia", installed: false },
    { id: "dlc_balt", name: "Beyond the Baltic Sea", installed: true },
  ],

  // [BROWSER-DEV FALLBACK] Misc
  open_url: () => true,
  open_path: () => true,
  show_in_explorer: () => true,
  get_temp_dir: () => "C:\\Users\\2akkv\\AppData\\Local\\Temp\\nexus",
  play_sound: () => true,

  // [BROWSER-DEV FALLBACK] Manifest
  get_manifest: () => ({}),
};

export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (IS_TAURI) {
    // Log every invoke to file
    try {
      const logArgs = args ? JSON.stringify(args) : "none";
      const logMsg = `[${new Date().toISOString()}] invoking: ${cmd} args=${logArgs}`;
      tauriInvoke("log_to_file", { message: logMsg }).catch(() => {});
      if (cmd === "download_with_progress") {
        console.log("[TAURI-INVOKE] download_with_progress args:", JSON.stringify(args));
      }
    } catch (_) {}
    // Long-running commands (downloads, extracts) should have NO timeout
    const longRunningCommands = new Set([
      "download_with_progress",
      "extract_archive",
      "extract_7z",
      "extract_dlc",
      "install_start",
      "create_backup",
      "restore_backup",
      "apply_profile_mods",
      "copy_to_mods",
      "steam_validate",
      "clean_game_files",
      "fetch_release",
      "fetch_release_assets",
      "fetch_manifest",
      "check_updates",
      "scan_mods",
      "list_profiles",
      "find_all_game_paths",
    ]);
    if (longRunningCommands.has(cmd)) {
      try {
        return await tauriInvoke<T>(cmd, args);
      } catch (e) {
        console.error(`[invoke] command "${cmd}" failed:`, e);
        try { tauriInvoke("log_to_file", { message: `[ERROR] invoke ${cmd} failed: ${e}` }).catch(() => {}); } catch (_) {}
        throw e;
      }
    }
    // Short commands: 8-second timeout
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: command "${cmd}" did not respond`)), 8000)
    );
    try {
      return await Promise.race([tauriInvoke<T>(cmd, args), timeout]);
    } catch (e) {
      console.error(`[invoke] command "${cmd}" failed:`, e);
      try { tauriInvoke("log_to_file", { message: `[ERROR] invoke ${cmd} failed: ${e}` }).catch(() => {}); } catch (_) {}
      throw e;
    }
  }
  const mock = mocks[cmd];
  if (!mock) {
    console.warn(`[mock] command "${cmd}" not implemented — returning null`);
    return null as T;
  }
  await new Promise((r) => setTimeout(r, 80 + Math.random() * 220));
  const result = mock(args);
  if (result instanceof Promise) return result as Promise<T>;
  return result as T;
}

// === Real Tauri invocations (typed wrappers — use these in production) ===
export const realTauri = {
  // Settings
  get_settings: () => invoke<Settings>("get_settings"),
  set_settings: (settings: Settings) => invoke("set_settings", { settings }),

  // GitHub
  fetch_release: (owner: string, repo: string, tag: string, token?: string) =>
    invoke<GitHubRelease>("fetch_release", { owner, repo, tag, token }),
  fetch_total_downloads: (owner: string, repo: string, tag: string, token?: string) =>
    invoke<number>("fetch_total_downloads", { owner, repo, tag, token }),

  // Steam / Game
  detect_steam_path: () => invoke<string>("detect_steam_path"),
  find_all_game_paths: () => invoke<GamePath[]>("find_all_game_paths"),
  get_game_version: (gamePath: string) => invoke<string>("get_game_version", { gamePath }),
  is_game_running: () => invoke<boolean>("is_game_running"),
  is_steam_running: () => invoke<boolean>("is_steam_running"),
  launch_game: (gamePath: string) => invoke<boolean>("launch_game", { gamePath }),
  launch_game_safe_mode: (gamePath: string) => invoke<boolean>("launch_game_safe_mode", { gamePath }),
  close_game: () => invoke<boolean>("close_game"),

  // DLC
  scan_dlc: (gamePath: string) => invoke<DlcInfo[]>("scan_dlc", { gamePath }),

  // Profiles
  list_profiles: (profilesPath: string) => invoke<ProfileInfo[]>("list_profiles", { profilesPath }),
  get_manifest: (profile_path: string) => invoke("get_manifest", { profile_path }),
  apply_profile_mods: (reference_extracted_dir: string, user_profile_sii_path: string) =>
    invoke("apply_profile_mods", { reference_extracted_dir, user_profile_sii_path }),
  patch_profile_mods_from_txt: (reference_txt: string, user_profile_sii_path: string) =>
    invoke("patch_profile_mods_from_txt", { reference_txt, user_profile_sii_path }),
  decrypt_sii_command: (path: string) => invoke<string>("decrypt_sii_command", { path }),
  encrypt_sii_command: (plainText: string, outputPath: string) =>
    invoke<string>("encrypt_sii_command", { plainText, outputPath }),

  // Hardware / Disk
  detect_hardware: () => invoke<HardwareInfo>("detect_hardware"),
  get_free_space: (path: string) => invoke<number>("get_free_space", { path }),
  get_mods_path: () => invoke<string>("get_mods_path"),

  // Backups
  list_backups: (backupsPath: string) => invoke<BackupInfo[]>("list_backups", { backupsPath }),
  create_backup: (profilesPath: string, backupsPath: string, name: string, auto: boolean) =>
    invoke<boolean>("create_backup", { profilesPath, backupsPath, name, auto }),
  restore_backup: (backupPath: string, profilesPath: string) =>
    invoke<boolean>("restore_backup", { backupPath, profilesPath }),
  delete_backup: (backupPath: string) => invoke<boolean>("delete_backup", { backupPath }),

  // Mods
  scan_mods: (modsPath: string) => invoke<ModGroups>("scan_mods", { modsPath }),
  toggle_mod: (modPath: string, enabled: boolean) => invoke<boolean>("toggle_mod", { modPath, enabled }),

  // Game log
  read_game_log: () => invoke<string>("read_game_log"),
  read_app_crash_log: () => invoke<string>("read_app_crash_log"),
  read_install_log: () => invoke<string>("read_install_log"),

  // Install engine
  install_start: (url: string, dest: string) => invoke<InstallSession>("install_start", { url, dest }),
  install_pause: () => invoke<boolean>("install_pause"),
  install_resume: () => invoke<boolean>("install_resume"),
  install_cancel: () => invoke<boolean>("install_cancel"),
  install_skip: () => invoke<boolean>("install_skip"),

  // Debug
  debug_profile_paths: () => invoke<{ docs: string; docs_exists: boolean; ets2_profiles: string; profiles_exists: boolean; ets2_mods: string; mods_exists: boolean; error: string | null }>("debug_profile_paths"),

  debug_read_profile: (profilePath: string) => invoke<any>("debug_read_profile", { profilePath }),

  // Download engine
  download_with_progress: (download_url: string, file_dest: string, github_token?: string, asset_updated_at?: string, file_name?: string) =>
    invoke("download_with_progress", { download_url, file_dest, github_token, asset_updated_at, file_name }),
  log_to_file: (message: string) => invoke("log_to_file", { message }),
  set_download_paused: (paused: boolean) => invoke("set_download_paused", { paused }),
  set_download_cancelled: (cancelled: boolean) => invoke("set_download_cancelled", { cancelled }),
  set_download_skip: () => invoke("set_download_skip"),
  extract_archive: (archivePath: string, destPath: string) =>
    invoke("extract_archive", { archivePath, destPath }),
  extract_dlc: (dlcArchive: string, dest: string) =>
    invoke("extract_dlc", { dlcArchive, dest }),
  copy_to_mods: (sourcePath: string, modsPath: string) =>
    invoke("copy_to_mods", { sourcePath, modsPath }),

  // Token
  get_github_token: () => invoke<string>("get_github_token"),
  set_github_token: (token: string) => invoke<boolean>("set_github_token", { token }),
  validate_github_token: (token: string) =>
    invoke<TokenValidation>("validate_github_token", { token }),

  // Misc
  open_url: (url: string) => invoke<boolean>("open_url", { url }),
  open_path: (path: string) => invoke<boolean>("open_path", { path }),
  show_in_explorer: (path: string) => invoke<boolean>("show_in_explorer", { path }),
  get_temp_dir: () => invoke<string>("get_temp_dir"),
  play_sound: (sound: string) => invoke<boolean>("play_sound", { sound }),

  // Optimize
  clean_game_files: (gamePath: string) => invoke<CleanResult>("clean_game_files", { gamePath }),
  clean_crash_dumps: (gamePath: string) => invoke<CleanResult>("clean_crash_dumps", { gamePath }),
  steam_validate: () => invoke<boolean>("steam_validate"),
  apply_buffer_page_fix: (gamePath: string) =>
    invoke<BufferPageResult>("apply_buffer_page_fix", { gamePath }),
  read_game_config: () => invoke<Record<string, string>>("read_game_config"),
  save_game_config: (updates: Record<string, string>) => invoke<void>("save_game_config", { updates }),

  // Tools
  fix_trailer_stutter: (modsPath: string, owner: string, repo: string, tag: string, token?: string) =>
    invoke<{ downloaded: string; size_mb: number }>("fix_trailer_stutter", { modsPath, githubOwner: owner, githubRepo: repo, githubTag: tag, token }),
  fix_mod_order: (user_sii_path: string, build_type: string) =>
    invoke<string>("fix_mod_order", { user_sii_path, build_type }),
  reset_manifest: () => invoke<boolean>("reset_manifest"),

  // Manifest
  load_manifest: () => invoke<Record<string, any>>("cmd_load_manifest"),
  save_manifest: (manifest: Record<string, any>) => invoke<void>("cmd_save_manifest", { manifest }),

  // GitHub assets
  list_github_release_assets: (owner: string, repo: string, tag: string, token?: string) =>
    invoke<GitHubAsset[]>("list_github_release_assets", { owner, repo, tag, token }),
};

/* === Event subscription (no-op in browser) === */
export async function listen<T = unknown>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  if (!IS_TAURI) {
    console.debug(`[mock] listen(${event}) — no events will fire in browser mode`);
    return () => {};
  }
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<T>(event, (e) => handler(e.payload));
  return unlisten;
}

export type GitHubAsset = {
  name: string;
  size: number;
  updated_at: string;
  browser_download_url: string;
  download_url: string;
};

export type GitHubRelease = {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: GitHubAsset[];
};

export type TokenValidation = { valid: boolean; rate_limit: number; scopes: string[] };
export type DlcInfo = { id: string; name: string; installed: boolean };

export type ProfileInfo = {
  id: string;
  name: string;
  location: "local" | "steam_cloud";
  money: number;
  experience: number;
  truck: string;
  lastModified: string;
  modsCount: number;
  siiPath: string;
};

export type HardwareInfo = {
  cpu: { name: string; cores: number; threads: number };
  gpu: { name: string; vram_mb: number };
  ram_gb: number;
  tier: "low" | "mid" | "high" | "ultra";
};

export type GamePath = { path: string; type: "Steam" | "Portable" | "SteamLibrary" | "Unknown"; version: string };

export type BackupInfo = {
  name: string;
  size_mb: number;
  created_at: string;
  auto: boolean;
};

export type ModEntry = {
  name: string;
  path: string;
  size_mb: number;
  enabled: boolean;
};

export type ModGroups = {
  maps: ModEntry[];
  trucks: ModEntry[];
  trailers: ModEntry[];
  sound: ModEntry[];
  graphics: ModEntry[];
  physics: ModEntry[];
  other: ModEntry[];
};

export type CleanResult = { removed: string[]; freed_mb: number };
export type BufferPageResult = { created_backup: string; value: number };

export type Settings = {
  game_path: string;
  mods_path: string;
  profile_path: string;
  build_type: "convoy" | "solo";
  theme: string;
  language: string;
  ui_scale: number;
  sounds_enabled: boolean;
  auto_backup: boolean;
  check_updates_on_start: boolean;
  background_updater: boolean;
  github_owner: string;
  github_repo: string;
  github_tag: string;
  github_token: string;
  dlc_owner: string;
  dlc_repo: string;
  dlc_tag: string;
};

export type InstallSession = {
  session_id: string;
  url: string;
  dest: string;
  total_bytes: number;
  status: string;
};
