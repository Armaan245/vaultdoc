import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';

export interface SidecarState {
  isRunning: boolean;
  isBundled: boolean;
  port: number;
  endpoint: string;
  message: string;
}

let sidecarProcess: ChildProcess | null = null;

/**
 * Checks if a port is currently listening on localhost
 */
export function checkPortListening(port = 11434): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/tags`, { timeout: 800 }, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Finds the bundled Ollama binary or falls back to system PATH
 */
export function resolveOllamaBinary(): string {
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'ollama.exe' : 'ollama';

  const candidates = [
    process.env.VAULTDOC_OLLAMA_PATH,
    (process as any).resourcesPath ? path.join((process as any).resourcesPath, 'resources', 'bin', binName) : undefined,
    (process as any).resourcesPath ? path.join((process as any).resourcesPath, 'bin', binName) : undefined,
    path.join(process.cwd(), 'resources', 'bin', binName),
    path.join(process.cwd(), 'desktop', 'src-tauri', 'binaries', isWin ? 'ollama-x86_64-pc-windows-msvc.exe' : 'ollama'),
    path.join(__dirname, '..', 'resources', 'bin', binName),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const stat = fs.statSync(p);
        if (stat.size > 0) return p;
      } catch (e) {}
    }
  }

  return 'ollama';
}

/**
 * Launches local Ollama sidecar if port 11434 is not already active
 */
export async function startOllamaSidecar(): Promise<SidecarState> {
  const isListening = await checkPortListening(11434);
  if (isListening) {
    return {
      isRunning: true,
      isBundled: false,
      port: 11434,
      endpoint: 'http://localhost:11434',
      message: 'Connected to existing system Ollama service',
    };
  }

  const binary = resolveOllamaBinary();

  try {
    sidecarProcess = spawn(binary, ['serve'], {
      env: {
        ...process.env,
        OLLAMA_HOST: '127.0.0.1:11434',
        OLLAMA_ORIGINS: '*',
      },
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
    });

    sidecarProcess.on('error', (err) => {
      console.warn('Ollama sidecar spawn error:', err.message);
      sidecarProcess = null;
    });

    sidecarProcess.on('exit', () => {
      sidecarProcess = null;
    });

    // Wait briefly for startup
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      isRunning: true,
      isBundled: true,
      port: 11434,
      endpoint: 'http://localhost:11434',
      message: 'Bundled Ollama local sidecar running on port 11434',
    };
  } catch (err: any) {
    return {
      isRunning: false,
      isBundled: false,
      port: 11434,
      endpoint: 'http://localhost:11434',
      message: `Failed to launch Ollama sidecar: ${err.message}`,
    };
  }
}

/**
 * Gracefully terminates the running sidecar process
 */
export function stopOllamaSidecar(): void {
  if (sidecarProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', sidecarProcess.pid?.toString() || '', '/f', '/t']);
      } else {
        sidecarProcess.kill('SIGTERM');
      }
    } catch (e) {}
    sidecarProcess = null;
  }
}

// Ensure cleanup on Node process exit
process.on('exit', () => stopOllamaSidecar());
process.on('SIGINT', () => {
  stopOllamaSidecar();
  process.exit();
});
process.on('SIGTERM', () => {
  stopOllamaSidecar();
  process.exit();
});
