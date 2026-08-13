import React from 'react';
import { Settings, X, Zap, Moon, Sun } from 'lucide-react';
import type { Theme } from '../services/theme';

interface SettingsProps {
  activeMode: 1 | 2;
  setActiveMode: (mode: 1 | 2) => void;
  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;
  model: string;
  setModel: (model: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}

const SettingsModal = ({ 
  activeMode, setActiveMode,
  ollamaUrl, setOllamaUrl,
  model, setModel,
  theme, onThemeChange,
  onClose 
}: SettingsProps) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-[2px]">
      <div className="bg-vault-panel border border-vault-border rounded-lg shadow-2xl w-[520px] flex flex-col text-vault-textBody">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-vault-border">
          <div className="flex items-center gap-2 text-vault-textPrimary font-semibold">
            <Settings className="w-4 h-4" />
            <span>Runtime Configuration</span>
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
          <div>
            <div className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-3 opacity-80">
              Inference Mode
            </div>
            
            <div className="flex flex-col gap-3">
              {/* Mode 1 */}
              <div 
                className={`flex items-start justify-between p-4 rounded border cursor-pointer transition-all ${
                  activeMode === 1 
                    ? 'bg-vault-accent/5 border-vault-accent shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                    : 'bg-vault-card border-vault-border opacity-70 hover:opacity-100'
                }`}
                onClick={() => setActiveMode(1)}
              >
                <div>
                  <div className={`font-medium text-sm mb-1 ${activeMode === 1 ? 'text-vault-accent' : 'text-vault-textPrimary'}`}>
                    Mode 1 — Air-Gapped Local (Ollama)
                  </div>
                  <div className="text-xs text-vault-textBody opacity-80">
                    All inference runs on-device. Zero external calls.
                  </div>
                </div>
                {/* Toggle */}
                <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${activeMode === 1 ? 'bg-vault-accent' : 'bg-vault-border'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${activeMode === 1 ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Mode 2 */}
              <div 
                className={`flex items-start justify-between p-4 rounded border cursor-pointer transition-all ${
                  activeMode === 2 
                    ? 'bg-vault-accent/5 border-vault-accent shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                    : 'bg-vault-card border-vault-border opacity-70 hover:opacity-100'
                }`}
                onClick={() => setActiveMode(2)}
              >
                <div>
                  <div className={`font-medium text-sm mb-1 ${activeMode === 2 ? 'text-vault-accent' : 'text-vault-textPrimary'}`}>
                    Mode 2 — BYOK Enterprise Cloud (OpenAI / Azure)
                  </div>
                  <div className="text-xs text-vault-textBody opacity-80">
                    Uses your own API key. Data leaves local network.
                  </div>
                </div>
                {/* Toggle */}
                <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${activeMode === 2 ? 'bg-vault-accent' : 'bg-vault-border'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${activeMode === 2 ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-1.5 opacity-80">
                Ollama URL
              </div>
              <input 
                type="text" 
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                disabled={activeMode !== 1}
                className="w-full bg-vault-base border border-vault-border rounded p-2 text-sm text-vault-textPrimary focus:outline-none focus:border-vault-accent disabled:opacity-50"
              />
            </div>
            
            <div>
              <div className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-1.5 opacity-80">
                Model
              </div>
              <div className="relative">
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={activeMode !== 1}
                  className="w-full bg-vault-base border border-vault-border rounded p-2 text-sm text-vault-textPrimary focus:outline-none focus:border-vault-accent appearance-none disabled:opacity-50 pr-8"
                >
                  <option value="qwen2.5-coder:7b">qwen2.5-coder:7b</option>
                  <option value="llama3:8b">llama3:8b</option>
                  <option value="mistral">mistral</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-vault-textBody opacity-70">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-2 p-3 rounded border text-xs font-medium ${
            activeMode === 1 
              ? 'bg-vault-securityDark/20 border-vault-security/30 text-vault-security' 
              : 'bg-vault-yellow/10 border-vault-yellow/30 text-vault-yellow'
          }`}>
            <Zap className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" />
            <span>{activeMode === 1 ? '0 External Outbound Calls Allowed' : 'External Outbound Calls Required'}</span>
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
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-vault-accent text-vault-base rounded hover:bg-opacity-90 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          >
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
