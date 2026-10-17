use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DurationPrefs {
    focus: u32,
    #[serde(rename = "break")]
    break_duration: u32,
    rest: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserPrefs {
    durations: DurationPrefs,
    is_sound_muted: bool,
    #[serde(default)]
    prayer_prefs: PrayerPrefs,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PrayerPrefs {
    #[serde(default)]
    wilaya_name: String,
    #[serde(default)]
    commune_id: String,
    #[serde(default)]
    muted_prayers: std::collections::HashMap<String, bool>,
}

fn prefs_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("failed to resolve app data dir: {err}"))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|err| format!("failed to create app data dir: {err}"))?;

    Ok(app_data_dir.join("user-prefs.json"))
}

#[tauri::command]
fn save_user_prefs(app: AppHandle, prefs: UserPrefs) -> Result<(), String> {
    let file_path = prefs_file_path(&app)?;
    let json = serde_json::to_string_pretty(&prefs)
        .map_err(|err| format!("failed to serialize user prefs: {err}"))?;

    fs::write(file_path, json).map_err(|err| format!("failed to write user prefs file: {err}"))
}

#[tauri::command]
fn load_user_prefs(app: AppHandle) -> Result<Option<UserPrefs>, String> {
    let file_path = prefs_file_path(&app)?;

    if !file_path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(file_path)
        .map_err(|err| format!("failed to read user prefs file: {err}"))?;
    let prefs = serde_json::from_str::<UserPrefs>(&raw)
        .map_err(|err| format!("failed to parse user prefs file: {err}"))?;

    Ok(Some(prefs))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let show = tauri::menu::MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide = tauri::menu::MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let quit = tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&show, &hide, &quit])?;
            tauri::tray::TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .tooltip("Focus")
            .menu(&menu)
            .on_menu_event(|app, event| {
                match event.id().as_ref() {
                "show" => {app.get_webview_window("main").unwrap().show().unwrap();}
                "hide" => {app.get_webview_window("main").unwrap().hide().unwrap();}
                "quit" => app.exit(0),
                _ => {}
                }
            })
            .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![save_user_prefs, load_user_prefs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
