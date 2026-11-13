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
        .invoke_handler(tauri::generate_handler![
            git_refresh_branches,
            git_diff,
            get_file_at_ref,
            git_restore
        ])
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
async fn git_refresh_branches(dir: String) -> Result<Vec<String>, String> {
    let _ = Command::new("git")
        .args(["fetch", "origin"])
        .current_dir(dir.clone())
        .output()
        .await;

    let output = Command::new("git")
        .args(["branch", "-a"])
        .current_dir(&dir)
        .output()
        .await
        .map_err(|e| format!("git branch failed: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    let items: Vec<String> = stdout
        .lines()
        .map(|line| line.trim().trim_start_matches("* ").to_string())
        .filter(|line| !line.is_empty() && !line.contains(" -> "))
        .collect();

    Ok(items)
}

#[tauri::command]
async fn git_diff(
    dir: String,
    branch_from: String,
    branch_to: String,
) -> Result<Vec<String>, String> {
    let output = Command::new("git")
        .args([
            "diff",
            "--name-status",
            branch_from.as_str(),
            branch_to.as_str(),
        ])
        .current_dir(&dir)
        .output()
        .await
        .map_err(|e| format!("git diff failed: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    let items: Vec<String> = stdout
        .lines()
        .map(|line| line.trim().trim_start_matches("* ").replace('\t', "||"))
        .filter(|line| !line.is_empty())
        .collect();

    // println!("{:?}", items);

    Ok(items)
}

#[tauri::command]
async fn get_file_at_ref(
    repo_path: &str,
    git_ref: &str,
    file_path: &str,
) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(["show", &format!("{}:{}", git_ref, file_path)])
        .current_dir(repo_path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
async fn git_restore(
    repo_path: &str,
    branch: &str,
    items: Vec<String>,
) -> Result<String, String> {
    // git restore --source=origin/release/windows-dev -- index.html about.html

    let mut cmd = std::process::Command::new("git");
    cmd.arg("restore")
        .arg(format!("--source={}", branch))
        .arg("--")
        .args(&items)
        .current_dir(repo_path);

    let output = cmd.output().map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
