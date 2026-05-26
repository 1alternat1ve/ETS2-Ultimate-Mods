use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
struct VersionJson {
    version: String,
    url: String,
    notes: Option<String>,
}

#[tauri::command]
pub async fn check_launcher_update() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let current = env!("CARGO_PKG_VERSION");

    let resp = client
        .get("https://raw.githubusercontent.com/1alternat1ve/ETS2-Ultimate-Mods/main/version.json")
        .header("User-Agent", "Nexus-Update-Checker")
        .send()
        .await
        .map_err(|e| format!("Сеть недоступна: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GitHub недоступен: {}", resp.status()));
    }

    let info: VersionJson = resp.json().await.map_err(|e| format!("Ошибка парсинга: {}", e))?;

    if info.version == current {
        Ok(serde_json::json!({ "available": false }))
    } else {
        Ok(serde_json::json!({
            "available": true,
            "version": info.version,
            "current_version": current,
            "url": info.url,
            "notes": info.notes,
        }))
    }
}

#[tauri::command]
pub async fn download_and_run_update(url: String) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())?;

    let tmp_dir = std::env::temp_dir();
    let file_name = url
        .split('/')
        .last()
        .unwrap_or("NexusUpdate.exe");
    let dest_path = tmp_dir.join(file_name);

    let response = client
        .get(&url)
        .header("User-Agent", "Nexus-Update-Downloader")
        .send()
        .await
        .map_err(|e| format!("Ошибка скачивания: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Скачивание не удалось: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Ошибка чтения: {}", e))?;

    std::fs::write(&dest_path, &bytes)
        .map_err(|e| format!("Ошибка записи: {}", e))?;

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;

        std::process::Command::new(&dest_path)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Не удалось запустить установщик: {}", e))?;
    }

    Ok(())
}
