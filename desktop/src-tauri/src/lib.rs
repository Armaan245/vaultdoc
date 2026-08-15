#[tauri::command]
fn app_minimize(window: tauri::WebviewWindow) {
  let _ = window.minimize();
}

#[tauri::command]
fn app_maximize(window: tauri::WebviewWindow) {
  if let Ok(is_max) = window.is_maximized() {
    if is_max {
      let _ = window.unmaximize();
    } else {
      let _ = window.maximize();
    }
  } else {
    let _ = window.maximize();
  }
}

#[tauri::command]
fn app_close(window: tauri::WebviewWindow) {
  let _ = window.close();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![app_minimize, app_maximize, app_close])
    .setup(|app| {
      use tauri::Manager;
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_decorations(false);
      }
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
