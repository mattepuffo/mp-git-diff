mod window_state;

use crate::window_state::WindowState;
use tauri::{Manager, PhysicalSize};
use tauri_plugin_store::StoreExt;
use tokio::process::Command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![git_refresh_branches])
        .setup(|app| {
            let store = app.store("mpgitdiff_settings.json")?;
            let store_settings: WindowState = store
                .get("settings")
                .and_then(|value| serde_json::from_value(value).ok())
                .unwrap_or(WindowState {
                    is_maximized: false,
                });

            if let Some(window) = app.get_webview_window("main") {
                if store_settings.is_maximized {
                    let _ = window.maximize();
                } else {
                    if let Ok(Some(monitor)) = window.current_monitor() {
                        let size = monitor.size();
                        let scale_factor = monitor.scale_factor();

                        let width = (size.width as f64 * 0.8 / scale_factor) as u32;
                        let height = (size.height as f64 * 0.8 / scale_factor) as u32;

                        let _ =
                            window.set_size(tauri::Size::Physical(PhysicalSize { width, height }));

                        let _ = window.center();
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn git_refresh_branches(dir: String) -> Result<String, String> {
    let output = {
        // Linux e macOS
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        {
            Command::new("git")
                .args(["branch", "-r"])
                .current_dir(&dir)
                .output()
                .await
                .map_err(|e| format!("git failed: {}", e))?
        }

        // Windows tramite WSL
        #[cfg(target_os = "windows")]
        {
            Command::new("wsl")
                .arg("--cd")
                .arg(&dir)
                .args(["git", "branch", "-r"])
                .output()
                .await
                .map_err(|e| format!("wsl git failed: {}", e))?
        }
    };

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    println!("{}", stdout);

    Ok(stdout)
}
