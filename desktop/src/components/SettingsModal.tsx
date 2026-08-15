import { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Zap, 
  Moon, 
  Sun, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Cpu, 
  Server, 
  Key, 
  Eye, 
  EyeOff,
  GitPullRequest,
  Lock,
  Palette,
  Shield
} from 'lucide-react';
import type { Theme } from '../services/theme';
import { 
  getStoredProviderConfig, 
  saveProviderConfig, 
  fetchAvailableModels, 
  isLocalEndpoint,
  PROVIDER_DEFAULTS, 
  type ProviderConfig 
} from '../services/ai';
import { 
  getStoredGitHubConfig, 
  saveGitHubConfig, 
  type GitHubConfig 
} from '../services/github';

interface SettingsProps {
  activeMode: 1 | 2;
  setActiveMode: (mode: 1 | 2) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}

type TabKey = 'engine' | 'github' | 'appearance' | 'security';

export const SettingsModal = ({ 
  activeMode, 
  setActiveMode,
  theme, 
  onThemeChange,
  onClose 
}: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('engine');
  
  const [config, setConfig] = useState<ProviderConfig>(getStoredProviderConfig);
  const [gitHubConfig, setGitHubConfig] = useState<GitHubConfig>(getStoredGitHubConfig);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [fetchStatus, setFetchStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showGitHubToken, setShowGitHubToken] = useState<boolean>(false);

  const isLocal = isLocalEndpoint(config.baseUrl);

  // Auto-detect & switch security mode based on Base Endpoint URL
  useEffect(() => {
    if (!isLocal) {
      setActiveMode(2);
    } else if (config.provider === 'ollama' || config.provider === 'lmstudio') {
      setActiveMode(1);
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
    saveGitHubConfig(gitHubConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-[3px] p-4 select-none animate-fadeIn">
      <div className="bg-[#0b1224] border border-vault-border rounded-xl shadow-2xl w-[720px] h-[480px] flex flex-col text-slate-300 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-vault-border bg-[#070b16] shrink-0">
          <div className="flex items-center gap-2 text-white font-bold">
            <Settings className="w-5 h-5 text-cyan-400" />
            <span className="text-sm">Runtime Configuration & Settings</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Navigation Drawer */}
          <div className="w-[200px] border-r border-vault-border bg-[#070b16] shrink-0 p-3 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('engine')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border-l-2 ${
                activeTab === 'engine' 
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-vault-border/50'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Model Engine</span>
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border-l-2 ${
                activeTab === 'github' 
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-vault-border/50'
              }`}
            >
              <GitPullRequest className="w-4 h-4" />
              <span>GitHub Integration</span>
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border-l-2 ${
                activeTab === 'appearance' 
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-vault-border/50'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Appearance & Theme</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border-l-2 ${
                activeTab === 'security' 
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-vault-border/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Security & Network</span>
            </button>
          </div>

          {/* Right Active Panel */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#0b1224]">
            
            {/* === TAB: MODEL ENGINE === */}
            {activeTab === 'engine' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase opacity-90">
                  Model Provider Engine
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleProviderChange('ollama')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      config.provider === 'ollama'
                        ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-[#070b16] border-vault-border text-slate-400 hover:text-white'
                    }`}
                  >
                    <Cpu className="w-4 h-4 mb-1.5 text-cyan-400" />
                    <span className="text-xs font-bold">Ollama</span>
                    <span className="text-[9px] opacity-70">Default (Port 11434)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderChange('lmstudio')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      config.provider === 'lmstudio'
                        ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-[#070b16] border-vault-border text-slate-400 hover:text-white'
                    }`}
                  >
                    <Server className="w-4 h-4 mb-1.5 text-cyan-400" />
                    <span className="text-xs font-bold">LM Studio</span>
                    <span className="text-[9px] opacity-70">OpenAI API (/v1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderChange('custom')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      config.provider === 'custom'
                        ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-[#070b16] border-vault-border text-slate-400 hover:text-white'
                    }`}
                  >
                    <Key className="w-4 h-4 mb-1.5 text-cyan-400" />
                    <span className="text-xs font-bold">Custom OpenAI</span>
                    <span className="text-[9px] opacity-70">Custom Endpoint</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1.5 opacity-90">
                      Base Endpoint URL
                    </div>
                    <input 
                      type="text" 
                      value={config.baseUrl}
                      onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                      placeholder="e.g. http://localhost:11434"
                      className="w-full bg-[#070b16] border border-vault-border rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  {config.provider !== 'ollama' && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1.5 opacity-90">
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
                            ? 'Leave blank for local server' 
                            : 'Paste API Key (sk-...)'}
                          className="w-full bg-[#070b16] border border-vault-border rounded-lg p-2 pr-10 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 text-slate-400 hover:text-white"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase opacity-90">
                        Active Model
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFetchModels()}
                        disabled={isFetchingModels || !config.baseUrl}
                        className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:underline disabled:opacity-50 font-medium"
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
                          className="w-full bg-[#070b16] border border-vault-border rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400 pr-8"
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
                          className="w-full bg-[#070b16] border border-vault-border rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      )}
                    </div>

                    {fetchStatus && (
                      <div className={`flex items-center gap-1.5 mt-2 text-xs ${
                        fetchStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {fetchStatus.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{fetchStatus.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* GitHub Tab */}
            {activeTab === 'github' && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1.5 opacity-90 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
                      Local GitHub Integration (PAT)
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono font-normal flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Stored strictly on-device in local storage
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Enables one-click Pull Request creation directly to GitHub REST API with zero intermediary proxies.
                  </p>

                  <div className="bg-[#070b16] border border-vault-border rounded-xl p-3.5 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Target Repository Full Name (owner/repo)
                      </label>
                      <input
                        type="text"
                        value={gitHubConfig.repoFullName}
                        onChange={(e) => setGitHubConfig({ ...gitHubConfig, repoFullName: e.target.value })}
                        placeholder="e.g. facebook/react or my-org/backend-service"
                        className="w-full bg-[#0b1224] border border-vault-border rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Fine-Grained Personal Access Token (PAT)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showGitHubToken ? 'text' : 'password'}
                          value={gitHubConfig.pat}
                          onChange={(e) => setGitHubConfig({ ...gitHubConfig, pat: e.target.value })}
                          placeholder="github_pat_... (Requires 'Pull requests: Read & Write' permission)"
                          className="w-full bg-[#0b1224] border border-vault-border rounded-lg p-2 pr-10 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGitHubToken(!showGitHubToken)}
                          className="absolute right-2.5 text-slate-400 hover:text-white"
                        >
                          {showGitHubToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3 opacity-90">
                    Appearance & Theme
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Dark Mode Option */}
                    <button
                      type="button"
                      onClick={() => onThemeChange('dark')}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        theme === 'dark'
                          ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                          : 'bg-[#070b16] border-vault-border text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold">Dark Mode</span>
                          <span className="text-[10px] opacity-70">Cyberpunk Slate (#0B101D)</span>
                        </div>
                      </div>
                      {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"></div>}
                    </button>

                    {/* Light Mode Option */}
                    <button
                      type="button"
                      onClick={() => onThemeChange('light')}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        theme === 'light'
                          ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_12px_rgba(2,132,199,0.15)]'
                          : 'bg-[#070b16] border-vault-border text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold">Light Mode</span>
                          <span className="text-[10px] opacity-70">Clean White/Slate (#F8FAFC)</span>
                        </div>
                      </div>
                      {theme === 'light' && <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"></div>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3 opacity-90">
                    Security & Network Isolation
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {/* Mode 1 */}
                    <div 
                      className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                        !isLocal
                          ? 'opacity-40 cursor-not-allowed bg-[#070b16] border-vault-border'
                          : activeMode === 1 
                            ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)] cursor-pointer' 
                            : 'bg-[#070b16] border-vault-border opacity-70 hover:opacity-100 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (isLocal) setActiveMode(1);
                      }}
                    >
                      <div>
                        <div className={`font-bold text-sm mb-0.5 ${activeMode === 1 && isLocal ? 'text-cyan-400' : 'text-white'}`}>
                          Mode 1 — Air-Gapped Local {!isLocal && <span className="text-amber-500 text-xs font-normal ml-1">(Disabled: External URL)</span>}
                        </div>
                        <div className="text-xs text-slate-400">
                          {!isLocal 
                            ? 'Locked: External cloud domain detected. Outbound calls required.' 
                            : 'All inference runs on-device via local endpoints. Zero external telemetry.'}
                        </div>
                      </div>
                      <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${activeMode === 1 && isLocal ? 'bg-cyan-400' : 'bg-vault-border'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${activeMode === 1 && isLocal ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    {/* Mode 2 */}
                    <div 
                      className={`flex items-start justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        activeMode === 2 
                          ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                          : 'bg-[#070b16] border-vault-border opacity-70 hover:opacity-100'
                      }`}
                      onClick={() => setActiveMode(2)}
                    >
                      <div>
                        <div className={`font-bold text-sm mb-0.5 ${activeMode === 2 ? 'text-cyan-400' : 'text-white'}`}>
                          Mode 2 — Enterprise Cloud
                        </div>
                        <div className="text-xs text-slate-400">
                          Uses remote OpenAI-compatible APIs or custom enterprise gateways.
                        </div>
                      </div>
                      <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${activeMode === 2 ? 'bg-cyan-400' : 'bg-vault-border'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${activeMode === 2 ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all mt-4 ${
                    activeMode === 1 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  }`}>
                    {activeMode === 1 ? (
                      <>
                        <Zap className="w-4 h-4 flex-shrink-0" fill="currentColor" />
                        <span>0 External Outbound Calls — 100% Air-Gapped On-Device Local Processing</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                        <span>⚠️ External Outbound Calls Required — Code snippets & AST metadata will leave your local machine.</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-vault-border bg-[#070b16] shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-black rounded-lg transition-all shadow-[0_0_12px_rgba(56,189,248,0.3)] active:scale-95"
          >
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
