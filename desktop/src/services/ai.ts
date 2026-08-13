export interface ProviderConfig {
  provider: 'ollama' | 'lmstudio' | 'custom';
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  apiKey: '',
  model: 'qwen2.5-coder:7b'
};

export const PROVIDER_DEFAULTS: Record<'ollama' | 'lmstudio' | 'custom', { baseUrl: string; model: string }> = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5-coder:7b'
  },
  lmstudio: {
    baseUrl: 'http://localhost:1234/v1',
    model: 'qwen2.5-coder-7b-instruct'
  },
  custom: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o'
  }
};

/**
 * Returns true if endpoint URL points to local loopback interface (localhost, 127.0.0.1, 0.0.0.0).
 */
export function isLocalEndpoint(url: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('localhost') || 
    lower.includes('127.0.0.1') || 
    lower.includes('0.0.0.0') || 
    lower.includes('[::1]')
  );
}

export function getStoredProviderConfig(): ProviderConfig {
  try {
    const stored = localStorage.getItem('vaultdoc_provider_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PROVIDER_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load provider config', e);
  }
  return DEFAULT_PROVIDER_CONFIG;
}

export function saveProviderConfig(config: ProviderConfig): void {
  try {
    localStorage.setItem('vaultdoc_provider_config', JSON.stringify(config));
    window.dispatchEvent(new Event('vaultdoc_config_change'));
  } catch (e) {
    console.error('Failed to save provider config', e);
  }
}

/**
 * Dynamically queries available models from Ollama, LM Studio, or OpenAI-compatible endpoints.
 */
export async function fetchAvailableModels(config: ProviderConfig): Promise<string[]> {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (config.apiKey && config.apiKey.trim().length > 0) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
  } else {
    headers['Authorization'] = 'Bearer local';
  }

  const models: string[] = [];

  // 1. Try OpenAI-compatible /v1/models or /models endpoint
  try {
    const v1Url = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
    const res = await fetch(v1Url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        data.data.forEach((m: any) => {
          if (m.id) models.push(m.id);
        });
      }
    }
  } catch (e) {
    // Ignore and proceed to Ollama fallback
  }

  // 2. Try Ollama native /api/tags endpoint
  if (models.length === 0) {
    try {
      const ollamaUrl = baseUrl.endsWith('/v1') ? baseUrl.replace(/\/v1$/, '') : baseUrl;
      const res = await fetch(`${ollamaUrl}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          data.models.forEach((m: any) => {
            if (m.name) models.push(m.name);
          });
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  if (models.length === 0) {
    throw new Error(`Unable to fetch models from ${baseUrl}. Verify the endpoint is running.`);
  }

  return Array.from(new Set(models));
}
