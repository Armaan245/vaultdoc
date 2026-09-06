import { invoke } from '@tauri-apps/api/core';

export interface OllamaSidecarStatus {
  isRunning: boolean;
  isBundled: boolean;
  status: 'connected' | 'starting' | 'bundled' | 'external' | 'offline';
  port: number;
  endpoint: string;
  models: string[];
  message: string;
  lastChecked: Date;
}

type StatusListener = (status: OllamaSidecarStatus) => void;
const listeners: Set<StatusListener> = new Set();

let currentStatus: OllamaSidecarStatus = {
  isRunning: false,
  isBundled: false,
  status: 'starting',
  port: 11434,
  endpoint: 'http://localhost:11434',
  models: [],
  message: 'Initializing inference sidecar watcher...',
  lastChecked: new Date(),
};

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(currentStatus);
    } catch (e) {
      console.error('Error in sidecar listener:', e);
    }
  });
}

/**
 * Directly queries tags from the Ollama HTTP API
 */
async function fetchTags(endpoint: string): Promise<string[]> {
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        return data.models.map((m: any) => m.name || m.model).filter(Boolean);
      }
    }
  } catch (e) {}
  return [];
}

/**
 * Checks current Ollama sidecar status via Tauri IPC and HTTP health check
 */
export async function checkSidecarHealth(endpoint = 'http://localhost:11434'): Promise<OllamaSidecarStatus> {
  let isRunning = false;
  let isBundled = false;
  let message = 'Checking Ollama sidecar...';

  // 1. Try Tauri backend status
  try {
    const res: any = await invoke('get_ollama_sidecar_status');
    if (res) {
      isRunning = res.is_running;
      isBundled = res.is_bundled;
      message = res.message || message;
    }
  } catch {
    // Web / non-Tauri mode fallback
  }

  // 2. HTTP Health check fallback
  const models = await fetchTags(endpoint);
  if (models.length > 0 || isRunning) {
    isRunning = true;
    currentStatus = {
      isRunning: true,
      isBundled,
      status: isBundled ? 'bundled' : 'external',
      port: 11434,
      endpoint,
      models,
      message: isBundled
        ? `Managed local sidecar online (${models.length} models ready)`
        : `Connected to system Ollama (${models.length} models ready)`,
      lastChecked: new Date(),
    };
  } else {
    currentStatus = {
      isRunning: false,
      isBundled: false,
      status: 'offline',
      port: 11434,
      endpoint,
      models: [],
      message: 'Ollama engine offline. Click to launch bundled sidecar.',
      lastChecked: new Date(),
    };
  }

  notifyListeners();
  return currentStatus;
}

/**
 * Triggers startup of the bundled sidecar
 */
export async function startSidecar(): Promise<OllamaSidecarStatus> {
  currentStatus = {
    ...currentStatus,
    status: 'starting',
    message: 'Starting local Ollama sidecar engine...',
  };
  notifyListeners();

  try {
    const res: any = await invoke('start_ollama_sidecar');
    if (res) {
      currentStatus.isBundled = res.is_bundled;
    }
  } catch (err: any) {
    console.warn('Tauri sidecar launch failed:', err);
  }

  // Wait briefly and verify health
  await new Promise((r) => setTimeout(r, 1200));
  return checkSidecarHealth();
}

/**
 * Stops the managed sidecar
 */
export async function stopSidecar(): Promise<OllamaSidecarStatus> {
  try {
    await invoke('stop_ollama_sidecar');
  } catch (e) {
    console.warn('Tauri stop sidecar invoke failed:', e);
  }
  return checkSidecarHealth();
}

/**
 * Subscribes to sidecar status updates
 */
export function subscribeSidecar(listener: StatusListener): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}

/**
 * Starts continuous health watcher
 */
let watcherInterval: any = null;
export function initSidecarWatcher(): void {
  if (watcherInterval) return;

  // Initial immediate check & auto-launch if needed
  checkSidecarHealth().then((status) => {
    if (!status.isRunning) {
      startSidecar();
    }
  });

  // Regular periodic poll every 10 seconds
  watcherInterval = setInterval(() => {
    checkSidecarHealth();
  }, 10000);
}
