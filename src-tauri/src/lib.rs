mod monitor;
mod skin_import;
mod social;
mod steps;
mod tray;

use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            tray::setup_tray(app)?;

            let providers_dir = if cfg!(debug_assertions) {
                let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
                manifest_dir
                    .parent()
                    .unwrap_or(manifest_dir)
                    .join("providers")
            } else {
                let resource_dir = app.path().resource_dir().map_err(|e| {
                    eprintln!("monitor: failed to locate resource directory: {}", e);
                    e
                })?;
                resource_dir.join("providers")
            };

            let engine = Arc::new(monitor::MonitorEngine::new(providers_dir));
            app.manage(engine.clone());
            let handle = app.handle().clone();
            let runner = monitor::start_monitor(handle, engine, 3000);
            app.manage(Mutex::new(runner));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            steps::save_steps,
            steps::load_steps,
            steps::load_step_history,
            social::social_start,
            social::social_stop,
            social::social_broadcast,
            social::social_get_peers,
            skin_import::import_skin_from_dir,
            skin_import::remove_skin,
            tray::update_tray_icon,
        ])
        .run(tauri::generate_context!())
        .expect("error while running aibubu");
}
