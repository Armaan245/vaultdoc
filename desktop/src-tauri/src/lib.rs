mod sidecar;

use sidecar::{get_ollama_sidecar_status, start_ollama_sidecar, stop_ollama_sidecar, terminate_sidecar};

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
  terminate_sidecar();
  let _ = window.close();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      app_minimize,
      app_maximize,
      app_close,
      get_ollama_sidecar_status,
      start_ollama_sidecar,
      stop_ollama_sidecar
    ])
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

      // Automatically check Ollama health and spin up sidecar if needed
      std::thread::spawn(|| {
        let _ = start_ollama_sidecar();
      });

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|_app_handle, event| {
    if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
      terminate_sidecar();
    }
  });
}
