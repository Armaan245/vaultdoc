import { useState, useEffect } from 'react';
import { Settings, X, Zap, Moon, Sun, RefreshCw, Check, AlertCircle, Cpu, Server, Key, Eye, EyeOff } from 'lucide-react';
import type { Theme } from '../services/theme';
import { 
  getStoredProviderConfig, 
  saveProviderConfig, 
  fetchAvailableModels, 
  isLocalEndpoint,
  PROVIDER_DEFAULTS, 
  type ProviderConfig 
} from '../services/ai';

interface SettingsProps {
  activeMode: 1 | 2;
  setActiveMode: (mode: 1 | 2) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}

const SettingsModal = ({ 
  activeMode, setActiveMode,
  theme, onThemeChange,
  onClose 
}: SettingsProps) => {
  const [config, setConfig] = useState<ProviderConfig>(getStoredProviderConfig);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [fetchStatus, setFetchStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  const isLocal = isLocalEndpoint(config.baseUrl);

  // Auto-detect & switch security mode based on Base Endpoint URL
  useEffect(() => {
    if (!isLocal) {
      setActiveMode(2); // Automatically force Mode 2 (Enterprise Cloud) for external cloud domains
    } else if (config.provider === 'ollama' || config.provider === 'lmstudio') {
      setActiveMode(1); // Automatically switch to Mode 1 (Air-Gapped Local) for local endpoints
    }
  }, [config.baseUrl, config.provider]);

  // Auto-fetch models on modal mount if URL exists
  useEffect(() => {
    if (config.baseUrl) {
      handleFetchModels(config);
    }
  }, []);

  const handleProviderChange = (provider: 'ollama' | 'lmstudio' | 'custom') => {
    const defaults = PROVIDER_DEFAULTS[provider];
    const newConfig: ProviderConfig = {
      ...config,
      provider,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      apiKey: provider === 'custom' ? config.apiKey || '' : ''
    };
    setConfig(newConfig);
    setFetchStatus(null);
    handleFetchModels(newConfig);
  };

  const handleFetchModels = async (targetConfig = config) => {
    setIsFetchingModels(true);
    setFetchStatus(null);
    try {
      const models = await fetchAvailableModels(targetConfig);
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(targetConfig.model)) {
        setConfig(prev => ({ ...prev, model: models[0] }));
      }
      setFetchStatus({ type: 'success', message: `Found ${models.length} model(s)` });
    } catch (err: any) {
      setFetchStatus({ type: 'error', message: err.message || 'Failed to fetch models' });
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = () => {
    saveProviderConfig(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-[2px]">
      <div className="bg-vault-panel border border-vault-border rounded-lg shadow-2xl w-[560px] flex flex-col text-vault-textBody">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-vault-border">
          <div className="flex items-center gap-2 text-vault-textPrimary font-semibold">
            <Settings className="w-4 h-4 text-vault-accent" />
            <span>Runtime Configuration & Model Provider</span>
          </div>
          <button onClick={onClose} className="opacity-70 hover:opacity-100 text-vault-textBody">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Appearance & Theme Section */}
          <div>
            <div className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-3 opacity-80">
              Appearance & Theme
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Dark Mode Option */}
              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`flex items-center justify-between p-3 rounded border transition-all ${
                  theme === 'dark'
                    ? 'bg-vault-accent/10 border-vault-accent text-vault-textPrimary shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'bg-vault-card border-vault-border text-vault-textBody opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-vault-accent' : 'text-vault-textBody'}`} />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold">Dark Mode</span>
                    <span className="text-[10px] opacity-70">Cyberpunk Slate (#0B101D)</span>
                  </div>
                </div>
                {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-vault-accent"></div>}
              </button>

              {/* Light Mode Option */}
              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`flex items-center justify-between p-3 rounded border transition-all ${
                  theme === 'light'
                    ? 'bg-vault-accent/10 border-vault-accent text-vault-textPrimary shadow-[0_0_12px_rgba(2,132,199,0.15)]'
                    : 'bg-vault-card border-vault-border text-vault-textBody opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-vault-accent' : 'text-vault-textBody'}`} />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold">Light Mode</span>
                    <span className="text-[10px] opacity-70">Clean White/Slate (#F8FAFC)</span>
                  </div>
                </div>
                {theme === 'light' && <div className="w-2 h-2 rounded-full bg-vault-accent"></div>}
              </button>
            </div>
          </div>

          {/* Model Provider Section */}
          <div>
            <div className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-3 opacity-80">
              Model Provider Engine
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* Ollama */}
              <button
                type="button"
                onClick={() => handleProviderChange('ollama')}
                className={`flex flex-col items-center justify-center p-3 rounded border text-center transition-all ${
                  config.provider === 'ollama'
                    ? 'bg-vault-accent/10 border-vault-accent text-vault-textPrimary shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'bg-vault-card border-vault-border text-vault-textBody opacity-70 hover:opacity-100'
                }`}
              >
                <Cpu className="w-4 h-4 mb-1.5 text-vault-accent" />
                <span className="text-xs font-bold">Ollama</span>
                <span className="text-[9px] opacity-70">Default (Port 11434)</span>
              </button>

              {/* LM Studio */}
              <button
                type="button"
                onClick={() => handleProviderChange('lmstudio')}
                className={`flex flex-col items-center justify-center p-3 rounded border text-center transition-all ${
                  config.provider === 'lmstudio'
                    ? 'bg-vault-accent/10 border-vault-accent text-vault-textPrimary shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'bg-vault-card border-vault-border text-vault-textBody opacity-70 hover:opacity-100'
                }`}
              >
                <Server className="w-4 h-4 mb-1.5 text-vault-accent" />
                <span className="text-xs font-bold">LM Studio</span>
                <span className="text-[9px] opacity-70">OpenAI API (/v1)</span>
              </button>

              {/* Custom */}
              <button
                type="button"
                onClick={() => handleProviderChange('custom')}
                className={`flex flex-col items-center justify-center p-3 rounded border text-center transition-all ${
                  config.provider === 'custom'
                    ? 'bg-vault-accent/10 border-vault-accent text-vault-textPrimary shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'bg-vault-card border-vault-border text-vault-textBody opacity-70 hover:opacity-100'
                }`}
              >
                <Key className="w-4 h-4 mb-1.5 text-vault-accent" />
                <span className="text-xs font-bold">Custom OpenAI</span>
                <span className="text-[9px] opacity-70">Custom Endpoint</span>
              </button>
            </div>

            {/* Base URL Input */}
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-1.5 opacity-80">
                  Base Endpoint URL
                </div>
                <input 
                  type="text" 
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  placeholder="e.g. http://localhost:11434"
                  className="w-full bg-vault-base border border-vault-border rounded p-2 text-sm text-vault-textPrimary focus:outline-none focus:border-vault-accent"
                />
              </div>

              {/* API Key Input (Custom / Non-Ollama Engines) */}
              {config.provider !== 'ollama' && (
                <div>
                  <div className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-1.5 opacity-80">
                    {config.provider === 'lmstudio' 
                      ? 'API KEY (Optional)' 
                      : 'API KEY (Required for Cloud / Optional for Local Server)'}
                  </div>
                  <div className="relative flex items-center">
                    <input 
                      type={showApiKey ? 'text' : 'password'} 
                      value={config.apiKey || ''}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder={config.provider === 'lmstudio' 
                        ? 'Leave blank for local server (or paste bearer token)' 
                        : 'Paste your API key (sk-... or gsk_...)'}
                      className="w-full bg-vault-base border border-vault-border rounded p-2 pr-10 text-sm text-vault-textPrimary focus:outline-none focus:border-vault-accent font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 text-vault-textBody hover:text-vault-textPrimary opacity-70 hover:opacity-100 transition-opacity"
                      title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Model Select + Fetch Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase opacity-80">
                    Active Model
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFetchModels()}
                    disabled={isFetchingModels || !config.baseUrl}
                    className="flex items-center gap-1.5 text-[11px] text-vault-accent hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                    <span>{isFetchingModels ? 'Fetching Models...' : 'Fetch Available Models'}</span>
                  </button>
                </div>

                <div className="relative">
                  {availableModels.length > 0 ? (
                    <select 
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full bg-vault-base border border-vault-border rounded p-2 text-sm text-vault-textPrimary focus:outline-none focus:border-vault-accent appearance-none pr-8"
                    >
                      {availableModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      placeholder="e.g. qwen2.5-coder:7b"
                      className="w-full bg-vault-base border border-vault-border rounded p-2 text-sm text-vault-textPrimary focus:outline-none focus:border-vault-accent"
                    />
                  )}
                </div>

                {/* Fetch Status Feedback */}
                {fetchStatus && (
                  <div className={`flex items-center gap-1.5 mt-2 text-xs ${
                    fetchStatus.type === 'success' ? 'text-vault-security' : 'text-red-400'
                  }`}>
                    {fetchStatus.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{fetchStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security & Network Mode Section */}
          <div>
            <div className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-3 opacity-80">
              Security & Network Isolation
            </div>
            
            <div className="flex flex-col gap-3">
              {/* Mode 1 */}
              <div 
                className={`flex items-start justify-between p-3.5 rounded border transition-all ${
                  !isLocal
                    ? 'opacity-40 cursor-not-allowed bg-vault-card border-vault-border'
                    : activeMode === 1 
                      ? 'bg-vault-accent/5 border-vault-accent shadow-[0_0_15px_rgba(6,182,212,0.1)] cursor-pointer' 
                      : 'bg-vault-card border-vault-border opacity-70 hover:opacity-100 cursor-pointer'
                }`}
                onClick={() => {
                  if (isLocal) setActiveMode(1);
                }}
              >
                <div>
                  <div className={`font-medium text-sm mb-0.5 ${activeMode === 1 && isLocal ? 'text-vault-accent' : 'text-vault-textPrimary'}`}>
                    Mode 1 — Air-Gapped Local {!isLocal && <span className="text-amber-500 text-xs font-normal ml-1">(Disabled: External URL)</span>}
                  </div>
                  <div className="text-xs text-vault-textBody opacity-80">
                    {!isLocal 
                      ? 'Locked: External cloud domain detected. Outbound calls required.' 
                      : 'All inference runs on-device via local endpoints. Zero external telemetry.'}
                  </div>
                </div>
                <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${activeMode === 1 && isLocal ? 'bg-vault-accent' : 'bg-vault-border'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${activeMode === 1 && isLocal ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Mode 2 */}
              <div 
                className={`flex items-start justify-between p-3.5 rounded border cursor-pointer transition-all ${
                  activeMode === 2 
                    ? 'bg-vault-accent/5 border-vault-accent shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                    : 'bg-vault-card border-vault-border opacity-70 hover:opacity-100'
                }`}
                onClick={() => setActiveMode(2)}
              >
                <div>
                  <div className={`font-medium text-sm mb-0.5 ${activeMode === 2 ? 'text-vault-accent' : 'text-vault-textPrimary'}`}>
                    Mode 2 — Enterprise Cloud
                  </div>
                  <div className="text-xs text-vault-textBody opacity-80">
                    Uses remote OpenAI-compatible APIs or custom gateways.
                  </div>
                </div>
                <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${activeMode === 2 ? 'bg-vault-accent' : 'bg-vault-border'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${activeMode === 2 ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-2 p-3 rounded border text-xs font-medium transition-all ${
            activeMode === 1 
              ? 'bg-vault-security/15 border-vault-security/30 text-vault-security' 
              : 'bg-amber-500/15 border-amber-500/30 text-amber-500'
          }`}>
            {activeMode === 1 ? (
              <>
                <Zap className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" />
                <span>0 External Outbound Calls — 100% Air-Gapped On-Device Local Processing</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                <span>⚠️ External Outbound Calls Required — Code snippets & AST metadata will leave your local machine!</span>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-vault-border bg-vault-panel rounded-b-lg">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-vault-textBody hover:text-vault-textPrimary transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-vault-accent text-vault-base rounded hover:opacity-90 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          >
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;

