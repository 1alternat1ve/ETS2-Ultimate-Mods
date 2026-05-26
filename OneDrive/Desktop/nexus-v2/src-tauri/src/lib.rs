mod commands;

use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
    LogicalSize,
};
use tauri_plugin_store::StoreExt;

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn trigger_check_updates(app: tauri::AppHandle) {
    let _ = app.emit("check-updates", ());
}

#[tauri::command]
fn navigate_to_section(app: tauri::AppHandle, section: String) {
    let _ = app.emit("navigate-section", section);
}

// Used by tray menu to prevent hide-on-blur from firing during a button click
static TRAY_HIDE_BLOCKED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[tauri::command]
fn begin_tray_click() {
    TRAY_HIDE_BLOCKED.store(true, std::sync::atomic::Ordering::SeqCst);
    tauri::async_runtime::spawn(async {
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        TRAY_HIDE_BLOCKED.store(false, std::sync::atomic::Ordering::SeqCst);
    });
}

#[tauri::command]
fn resize_tray_menu(app: tauri::AppHandle, height: f64) {
    if let Some(tray_win) = app.get_webview_window("tray_menu") {
        let _ = tray_win.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: 240,
            height: height as u32,
        }));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_panic_flag = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let app_panic_flag_clone = app_panic_flag.clone();
    std::panic::set_hook(Box::new(move |info| {
        let msg = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic".to_string()
        };
        let location = info.location().map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column())).unwrap_or_default();
        let _ = crate::commands::game::log_launcher("PANIC", &format!("{} at {}", msg, location));
        let _ = app_panic_flag_clone.store(true, std::sync::atomic::Ordering::SeqCst);
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
                let _ = window.set_size(LogicalSize::new(1280, 800));
                let _ = window.center();
            }
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .build(),
        )
        .setup(|app| {
            // Tray icon only — no native menu, we use a custom window instead
            let icon = Image::from_bytes(include_bytes!("../icons/icon.png"))?;

            // Build tray
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("NEXUS")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Right,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(tray_win) = app.get_webview_window("tray_menu") {
                            // Position at cursor — Windows API
                            let mut point = winapi::shared::windef::POINT { x: 0, y: 0 };
                            unsafe { winapi::um::winuser::GetCursorPos(&mut point) };
                            let menu_w = 240i32;
                            let menu_h = 280i32;
                            let x = point.x - menu_w / 2;
                            let y = point.y - menu_h;
                            let _ = tray_win.set_position(tauri::Position::Physical(
                                tauri::PhysicalPosition { x, y }
                            ));
                            let _ = tray_win.show();
                            let _ = tray_win.set_focus();
                        }
                    }
                    // Left click: show main window
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(main_win) = app.get_webview_window("main") {
                            let _ = main_win.show();
                            let _ = main_win.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Tray menu: hide at startup, shown only on right-click
            // Hide on blur UNLESS a button click is in progress (flag set by begin_tray_click)
            if let Some(tray_win) = app.get_webview_window("tray_menu") {
                let _ = tray_win.hide();
                let tray_win_clone = tray_win.clone();
                tray_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        if !TRAY_HIDE_BLOCKED.load(std::sync::atomic::Ordering::SeqCst) {
                            let _ = tray_win_clone.hide();
                        }
                    }
                });
            }

            // Settings store init
            let store = app.store("settings.json")?;
            if store.get("settings").is_none() {
                let default_settings = commands::settings::Settings::default();
                let json = serde_json::to_value(&default_settings)?;
                store.set("settings", json);
                let _ = store.save();
            }

            // Всегда сбрасываем размер и позицию главного окна при старте (override saved state)
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_size(LogicalSize::new(1280, 800));
                let _ = window.center();
                let _ = window.unmaximize();
            }

            // Window close -> hide instead of closing
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // App
            exit_app,
            show_main_window,
            trigger_check_updates,
            navigate_to_section,
            begin_tray_click,
            resize_tray_menu,
            // Settings
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::settings::reset_ui_scale,
            commands::settings::get_temp_dir,
            // Game (core)
            commands::game::detect_steam_path,
            commands::game::find_all_game_paths,
            commands::game::detect_game_type,
            commands::game::get_game_version,
            commands::game::is_game_running,
            commands::game::is_steam_running,
            commands::game::launch_game,
            commands::game::launch_game_safe_mode,
            commands::game::close_game,
            commands::game::scan_dlc,
            commands::game::detect_hardware,
            commands::game::get_free_space,
            commands::game::get_mods_path,
            commands::game::debug_profile_paths,
            commands::game::read_game_log,
            commands::game::read_game_crash_log,
            commands::game::read_app_crash_log,
            commands::game::read_install_log,
            commands::game::clear_install_log,
            commands::game::cmd_read_launcher_log,
            commands::game::open_url,
            commands::game::open_path,
            commands::game::show_in_explorer,
            commands::game::play_sound,
            commands::game::clean_game_files,
            commands::game::clean_crash_dumps,
            commands::game::steam_validate,
            commands::game::apply_buffer_page_fix,
            commands::game::read_game_config,
            commands::game::save_game_config,
            commands::tools::fix_trailer_stutter,
            commands::tools::reset_manifest,
            commands::game::extract_archive,
            // Mods
            commands::mods::scan_mods,
            commands::mods::toggle_mod,
            // Profiles
            commands::profile::list_profiles,
            commands::profile::patch_profile_mods_from_txt,
            commands::profile::fix_mod_order,
            commands::profile::decrypt_sii_command,
            commands::profile::encrypt_sii_command,
            commands::profile::read_file_raw,
            commands::profile::save_file_raw,
            commands::profile::get_config_cfg_path_cmd,
            // Backups
            commands::backup::list_backups,
            commands::backup::create_backup,
            commands::backup::restore_backup,
            commands::backup::delete_backup,
            // GitHub
            commands::github::fetch_release,
            commands::github::fetch_total_downloads,
            commands::github::get_github_token,
            commands::github::set_github_token,
            commands::github::validate_github_token,
            commands::github::list_github_release_assets,
            // Install engine
            commands::install::install_start,
            commands::install::install_pause,
            commands::install::install_resume,
            commands::install::install_cancel,
            commands::install::install_skip,
            commands::install::get_install_status,
            commands::install::extract_7z,
            commands::install::copy_to_mods,
            commands::install::download_with_progress,
            commands::install::log_install,
            commands::install::extract_dlc,
            commands::install::set_download_paused,
            commands::install::set_download_cancelled,
            commands::install::set_download_skip,
            // Manifest
            commands::manifest::cmd_load_manifest,
            commands::manifest::cmd_save_manifest,
            // Updater
            commands::updater::check_launcher_update,
            commands::updater::download_and_run_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
