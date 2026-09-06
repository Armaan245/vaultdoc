use serde::{Deserialize, Serialize};
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SidecarStatus {
    pub is_running: bool,
    pub is_bundled: bool,
    pub port: u16,
    pub endpoint: String,
    pub message: String,
}

static SIDECAR_CHILD: OnceLock<Arc<Mutex<Option<Child>>>> = OnceLock::new();

fn get_sidecar_holder() -> &'static Arc<Mutex<Option<Child>>> {
    SIDECAR_CHILD.get_or_init(|| Arc::new(Mutex::new(None)))
}

/// Checks if a TCP port is responding locally
pub fn is_port_in_use(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(600)).is_ok()
}

/// Locates the Ollama executable from bundled resources, sidecar folders, or system PATH
pub fn locate_ollama_binary() -> Option<PathBuf> {
    let mut candidate_paths = Vec::new();

    // Check environment variable
    if let Ok(env_path) = std::env::var("VAULTDOC_OLLAMA_PATH") {
        candidate_paths.push(PathBuf::from(env_path));
    }

    // Check application directory
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            candidate_paths.push(exe_dir.join("ollama.exe"));
            candidate_paths.push(exe_dir.join("ollama"));
            candidate_paths.push(exe_dir.join("resources").join("bin").join("ollama.exe"));
            candidate_paths.push(exe_dir.join("resources").join("bin").join("ollama"));
            candidate_paths.push(exe_dir.join("binaries").join("ollama.exe"));
            candidate_paths.push(exe_dir.join("binaries").join("ollama"));
            candidate_paths.push(exe_dir.join("binaries").join("ollama-x86_64-pc-windows-msvc.exe"));
        }
    }

    // Check current working directory & workspace resources
    if let Ok(cwd) = std::env::current_dir() {
        candidate_paths.push(cwd.join("resources").join("bin").join("ollama.exe"));
        candidate_paths.push(cwd.join("resources").join("bin").join("ollama"));
        candidate_paths.push(cwd.join("desktop").join("src-tauri").join("binaries").join("ollama-x86_64-pc-windows-msvc.exe"));
        candidate_paths.push(cwd.join("desktop").join("src-tauri").join("binaries").join("ollama.exe"));
        candidate_paths.push(cwd.join("desktop").join("src-tauri").join("binaries").join("ollama"));
        candidate_paths.push(cwd.join("src-tauri").join("binaries").join("ollama-x86_64-pc-windows-msvc.exe"));
        candidate_paths.push(cwd.join("src-tauri").join("binaries").join("ollama.exe"));
    }

    for path in candidate_paths {
        if path.exists() && path.is_file() {
            if let Ok(meta) = path.metadata() {
                if meta.len() > 0 {
                    return Some(path);
                }
            }
        }
    }

    // Fallback: check if standard command 'ollama' is runnable
    Some(PathBuf::from("ollama"))
}

#[tauri::command]
pub fn get_ollama_sidecar_status() -> SidecarStatus {
    let active = is_port_in_use(11434);
    let holder = get_sidecar_holder();
    let is_child_running = {
        if let Ok(mut guard) = holder.lock() {
            if let Some(child) = guard.as_mut() {
                match child.try_wait() {
                    Ok(None) => true,
                    _ => false,
                }
            } else {
                false
            }
        } else {
            false
        }
    };

    if active {
        if is_child_running {
            SidecarStatus {
                is_running: true,
                is_bundled: true,
                port: 11434,
                endpoint: "http://localhost:11434".into(),
                message: "Managed bundled Ollama sidecar is active on port 11434".into(),
            }
        } else {
            SidecarStatus {
                is_running: true,
                is_bundled: false,
                port: 11434,
                endpoint: "http://localhost:11434".into(),
                message: "Connected to existing system-level Ollama service".into(),
            }
        }
    } else {
        SidecarStatus {
            is_running: false,
            is_bundled: false,
            port: 11434,
            endpoint: "http://localhost:11434".into(),
            message: "Ollama inference service is offline".into(),
        }
    }
}

#[tauri::command]
pub fn start_ollama_sidecar() -> Result<SidecarStatus, String> {
    // 1. Check if already running on port 11434
    if is_port_in_use(11434) {
        return Ok(get_ollama_sidecar_status());
    }

    let bin_path = locate_ollama_binary()
        .ok_or_else(|| "Ollama binary could not be resolved in resources or PATH".to_string())?;

    let holder = get_sidecar_holder();
    let mut guard = holder.lock().map_err(|e| format!("Lock error: {e}"))?;

    // Terminate existing dead process if any
    if let Some(mut existing) = guard.take() {
        let _ = existing.kill();
    }

    // Spawn `ollama serve`
    #[cfg(target_os = "windows")]
    let child_res = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new(&bin_path)
            .arg("serve")
            .env("OLLAMA_HOST", "127.0.0.1:11434")
            .env("OLLAMA_ORIGINS", "*")
            .creation_flags(CREATE_NO_WINDOW)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
    };

    #[cfg(not(target_os = "windows"))]
    let child_res = Command::new(&bin_path)
        .arg("serve")
        .env("OLLAMA_HOST", "127.0.0.1:11434")
        .env("OLLAMA_ORIGINS", "*")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();

    match child_res {
        Ok(child) => {
            *guard = Some(child);
            // Give sidecar a moment to bind
            std::thread::sleep(Duration::from_millis(600));
            Ok(SidecarStatus {
                is_running: true,
                is_bundled: true,
                port: 11434,
                endpoint: "http://localhost:11434".into(),
                message: "Successfully launched Ollama local sidecar".into(),
            })
        }
        Err(err) => Err(format!("Failed to spawn Ollama sidecar from {bin_path:?}: {err}")),
    }
}

#[tauri::command]
pub fn stop_ollama_sidecar() -> Result<SidecarStatus, String> {
    let holder = get_sidecar_holder();
    if let Ok(mut guard) = holder.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    std::thread::sleep(Duration::from_millis(300));
    Ok(get_ollama_sidecar_status())
}

/// Graceful shutdown on application exit
pub fn terminate_sidecar() {
    let holder = get_sidecar_holder();
    if let Ok(mut guard) = holder.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
