import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Search,
  Settings,
  Palette,
  Keyboard,
  Cpu,
  Database,
  Code2,
  GitPullRequest,
  Puzzle,
  Terminal,
  ShieldCheck,
  FileText,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Folder,
  Copy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getStoredThemeConfig, 
  applyThemeConfig, 
  type Theme, 
  type ThemeConfig 
} from '../services/theme';
import { 
  getStoredProviderConfig, 
  saveProviderConfig, 
  fetchAvailableModels, 
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

type SettingCategory = 
  | 'general'
  | 'appearance'
  | 'shortcuts'
  | 'model'
  | 'vector'
  | 'ast'
  | 'github'
  | 'extensions'
  | 'hooks'
  | 'security'
  | 'logs';

export const SettingsModal: React.FC<SettingsProps> = ({
  onThemeChange,
  onClose
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('general');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Model State
  const [config, setConfig] = useState<ProviderConfig>(getStoredProviderConfig);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [fetchStatus, setFetchStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [contextWindow, setContextWindow] = useState<number>(16384);
  const [gpuOffload, setGpuOffload] = useState<boolean>(true);

  // GitHub State
  const [gitHubConfig, setGitHubConfig] = useState<GitHubConfig>(getStoredGitHubConfig);
  const [showGitHubToken, setShowGitHubToken] = useState<boolean>(false);

  // Workbench Preferences State
  const [workspaceRw, setWorkspaceRw] = useState<boolean>(true);
  const [autoReviewDiffs, setAutoReviewDiffs] = useState<boolean>(true);
  const [fullLocalAccess, setFullLocalAccess] = useState<boolean>(true);
  const [defaultEditor, setDefaultEditor] = useState<string>('Antigravity');
  const [terminalShell, setTerminalShell] = useState<string>('PowerShell');
  // Appearance & Theme State
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(getStoredThemeConfig);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const updateThemeConfig = (updater: (prev: ThemeConfig) => ThemeConfig) => {
    setThemeConfig(prev => {
      const next = updater(prev);
      applyThemeConfig(next);
      const activeVisualMode: Theme = next.mode === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
        : next.mode;
      onThemeChange(activeVisualMode);
      return next;
    });
  };

  const handleCopyTheme = (type: 'light' | 'dark') => {
    const data = type === 'light' ? themeConfig.lightTheme : themeConfig.darkTheme;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopyFeedback(type);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  // Vector & AST State
  const [embeddingModel, setEmbeddingModel] = useState<string>('nomic-embed-text');
  const [vectorCachePath] = useState<string>('C:\\Users\\armaa\\.vaultdoc\\lancedb');
  const [isReindexing, setIsReindexing] = useState<boolean>(false);
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);
  const [astLanguages, setAstLanguages] = useState<Record<string, boolean>>({
    python: true,
    typescript: true,
    rust: true,
    go: true,
    sql: true,
    cpp: true,
    java: false
  });

  // Security & Hook State
  const [secretRedaction, setSecretRedaction] = useState<boolean>(true);
  const [hookInstalled, setHookInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (config.baseUrl) {
      handleFetchModels(config);
    }
  }, []);

  const handleFetchModels = async (targetConfig = config) => {
    setIsFetchingModels(true);
    setFetchStatus(null);
    try {
      const models = await fetchAvailableModels(targetConfig);
      setAvailableModels(models);
      setFetchStatus({ type: 'success', message: `Discovered ${models.length} local models` });
    } catch (err: any) {
      setFetchStatus({ type: 'error', message: err.message || 'Unable to connect to model server' });
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSaveModelConfig = () => {
    saveProviderConfig(config);
    window.dispatchEvent(new Event('vaultdoc_config_change'));
  };

  const handleSaveGitHubConfig = () => {
    saveGitHubConfig(gitHubConfig);
  };

  const toggleLanguage = (lang: string) => {
    setAstLanguages(prev => ({ ...prev, [lang]: !prev[lang] }));
  };

  const handleReindex = () => {
    setIsReindexing(true);
    setTimeout(() => setIsReindexing(false), 1500);
  };

  const handleClearCache = () => {
    setIsClearingCache(true);
    setTimeout(() => setIsClearingCache(false), 1000);
  };

  const navCategories = [
    {
      group: 'WORKBENCH',
      items: [
        { id: 'general' as SettingCategory, label: 'General', icon: Settings },
        { id: 'appearance' as SettingCategory, label: 'Appearance & Theme', icon: Palette },
        { id: 'shortcuts' as SettingCategory, label: 'Keyboard shortcuts', icon: Keyboard },
      ]
    },
    {
      group: 'ENGINE & RAG',
      items: [
        { id: 'model' as SettingCategory, label: 'Local Model Runtime', icon: Cpu },
        { id: 'vector' as SettingCategory, label: 'LanceDB Vector Storage', icon: Database },
        { id: 'ast' as SettingCategory, label: 'Tree-sitter AST Parsers', icon: Code2 },
      ]
    },
    {
      group: 'INTEGRATIONS & CODING',
      items: [
        { id: 'github' as SettingCategory, label: 'GitHub Local-First PAT', icon: GitPullRequest },
        { id: 'extensions' as SettingCategory, label: 'IDE & Extensions Bridge', icon: Puzzle },
        { id: 'hooks' as SettingCategory, label: 'Terminal CLI & Git Hooks', icon: Terminal },
      ]
    },
    {
      group: 'SECURITY & COMPLIANCE',
      items: [
        { id: 'security' as SettingCategory, label: 'Zero-Egress Air-Gap', icon: ShieldCheck },
        { id: 'logs' as SettingCategory, label: 'Audit & Action Logs', icon: FileText },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#131316] text-white flex flex-col font-sans select-none animate-fadeIn">
      
      {/* Top Main Workspace Wrapper */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Navigation Rail (Settings Sidebar matching Screenshot 2) */}
        <aside className="w-[260px] flex-shrink-0 h-full bg-[#141416] border-r border-white/[0.04] flex flex-col p-3 text-xs">
          
          {/* Back to App Action Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-2 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer mb-3 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-medium text-xs">Back to app</span>
          </button>

          {/* Search Settings Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search size={13} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full bg-[#1c1c20] border border-white/[0.06] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Grouped Category Nav List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            {navCategories.map((group) => {
              const filteredItems = group.items.filter(item => 
                !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (filteredItems.length === 0) return null;

              return (
                <div key={group.group} className="space-y-1">
                  <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {group.group}
                  </div>
                  <div className="space-y-0.5">
                    {filteredItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeCategory === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveCategory(item.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-white/10 text-white font-medium shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                          <span className="text-xs truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </aside>

        {/* Right Settings Content Canvas (Scrollable) */}
        <main className="flex-1 h-full overflow-y-auto custom-scrollbar bg-[#111114] p-8">
          <div className="max-w-[760px] mx-auto space-y-8 animate-fadeIn pb-16">

            {/* 1. GENERAL */}
            {activeCategory === 'general' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">General</h1>
                  <p className="text-xs text-slate-400 mt-1">Configure workbench workspace permissions, tools, and execution environments.</p>
                </div>

                {/* Section: Permissions Card */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">Permissions</h3>
                  <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                    
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <h4 className="text-xs font-medium text-white">Workspace Read/Write Permissions</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Allow VaultDoc to generate and edit technical specs, diagrams, and tests directly on disk.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={workspaceRw}
                        onChange={(e) => setWorkspaceRw(e.target.checked)}
                        className="toggle-checkbox"
                      />
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <h4 className="text-xs font-medium text-white">Auto-review AST Changes</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Automatically analyze and validate uncommitted local diffs when workspaces change.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoReviewDiffs}
                        onChange={(e) => setAutoReviewDiffs(e.target.checked)}
                        className="toggle-checkbox"
                      />
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <h4 className="text-xs font-medium text-white">Full Local Sandbox Access</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Enable zero-prompt execution for local command builds and AST parsing tests.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={fullLocalAccess}
                        onChange={(e) => setFullLocalAccess(e.target.checked)}
                        className="toggle-checkbox"
                      />
                    </div>

                  </div>
                </div>

                {/* Section: General Tools Card */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">Workbench Tools</h3>
                  <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-medium text-white">Default Diff Viewer / Editor</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Choose where code files and PR diffs open when clicked.</p>
                      </div>
                      <select
                        value={defaultEditor}
                        onChange={(e) => setDefaultEditor(e.target.value)}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="Antigravity">Antigravity Studio</option>
                        <option value="VS Code">VS Code</option>
                        <option value="Cursor">Cursor</option>
                        <option value="Built-in Viewer">Built-in Viewer</option>
                      </select>
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-medium text-white">Integrated Terminal Shell</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Shell used for test execution and CLI script tasks.</p>
                      </div>
                      <select
                        value={terminalShell}
                        onChange={(e) => setTerminalShell(e.target.value)}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="PowerShell">PowerShell</option>
                        <option value="WSL / Bash">WSL / Bash</option>
                        <option value="Command Prompt">Command Prompt</option>
                      </select>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* 2. APPEARANCE & THEME */}
            {activeCategory === 'appearance' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">Appearance</h1>
                </div>

                {/* Section 1: Theme Cards (System / Light / Dark) */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    
                    {/* System Theme Card */}
                    <button
                      type="button"
                      onClick={() => updateThemeConfig(prev => ({ ...prev, mode: 'system' }))}
                      className="group text-center cursor-pointer"
                    >
                      <div className={`h-28 rounded-2xl p-2.5 transition-all flex flex-col justify-end overflow-hidden relative border ${
                        themeConfig.mode === 'system'
                          ? 'border-sky-400/80 bg-[#1c1c20] ring-2 ring-sky-400/30'
                          : 'border-white/10 bg-[#18181c] hover:border-white/20'
                      }`}>
                        {/* Mockup split window */}
                        <div className="w-full h-20 rounded-xl overflow-hidden shadow-lg flex border border-white/10">
                          {/* Left Half (Light) */}
                          <div className="w-1/2 bg-[#f1f3f5] p-2 flex flex-col justify-between">
                            <div className="w-10 h-1.5 rounded-full bg-slate-400/60" />
                            <div className="space-y-1">
                              <div className="w-12 h-1 rounded-full bg-slate-300" />
                              <div className="w-16 h-1 rounded-full bg-slate-300" />
                              <div className="w-8 h-1 rounded-full bg-slate-300" />
                            </div>
                          </div>
                          {/* Right Half (Dark) */}
                          <div className="w-1/2 bg-[#212124] p-2 flex flex-col justify-between">
                            <div className="w-10 h-1.5 rounded-full bg-white/40" />
                            <div className="space-y-1">
                              <div className="w-12 h-1 rounded-full bg-white/20" />
                              <div className="w-16 h-1 rounded-full bg-white/20" />
                              <div className="w-8 h-1 rounded-full bg-white/20" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs mt-2 block font-medium ${themeConfig.mode === 'system' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        System
                      </span>
                    </button>

                    {/* Light Theme Card */}
                    <button
                      type="button"
                      onClick={() => updateThemeConfig(prev => ({ ...prev, mode: 'light' }))}
                      className="group text-center cursor-pointer"
                    >
                      <div className={`h-28 rounded-2xl p-2.5 transition-all flex flex-col justify-end overflow-hidden relative border ${
                        themeConfig.mode === 'light'
                          ? 'border-sky-400/80 bg-[#1c1c20] ring-2 ring-sky-400/30'
                          : 'border-white/10 bg-[#18181c] hover:border-white/20'
                      }`}>
                        {/* Mockup light window */}
                        <div className="w-full h-20 rounded-xl bg-[#f8fafc] p-2.5 flex flex-col justify-between shadow-lg border border-slate-200">
                          <div className="w-12 h-1.5 rounded-full bg-slate-400/70" />
                          <div className="space-y-1.5">
                            <div className="w-16 h-1 rounded-full bg-slate-300" />
                            <div className="w-20 h-1 rounded-full bg-slate-300" />
                            <div className="w-10 h-1 rounded-full bg-slate-300" />
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs mt-2 block font-medium ${themeConfig.mode === 'light' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        Light
                      </span>
                    </button>

                    {/* Dark Theme Card */}
                    <button
                      type="button"
                      onClick={() => updateThemeConfig(prev => ({ ...prev, mode: 'dark' }))}
                      className="group text-center cursor-pointer"
                    >
                      <div className={`h-28 rounded-2xl p-2.5 transition-all flex flex-col justify-end overflow-hidden relative border ${
                        themeConfig.mode === 'dark'
                          ? 'border-sky-400/80 bg-[#1c1c20] ring-2 ring-sky-400/30'
                          : 'border-white/10 bg-[#18181c] hover:border-white/20'
                      }`}>
                        {/* Mockup dark window */}
                        <div className="w-full h-20 rounded-xl bg-[#1e1e22] p-2.5 flex flex-col justify-between shadow-lg border border-white/10">
                          <div className="w-12 h-1.5 rounded-full bg-white/40" />
                          <div className="space-y-1.5">
                            <div className="w-16 h-1 rounded-full bg-white/20" />
                            <div className="w-20 h-1 rounded-full bg-white/20" />
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs mt-2 block font-medium ${themeConfig.mode === 'dark' ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        Dark
                      </span>
                    </button>

                  </div>
                </div>

                {/* Section 2: Code Diff Live Preview Box */}
                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className="p-4 font-mono text-xs overflow-x-auto grid grid-cols-2 divide-x divide-white/[0.08]">
                    {/* Left Deletion Diff (Red) */}
                    <div className="space-y-1 pr-3">
                      <div className="flex text-slate-400">
                        <span className="w-6 text-slate-600 select-none">1</span>
                        <span className="text-purple-400">const</span>&nbsp;<span className="text-amber-300">themePreview</span>:&nbsp;<span className="text-sky-300">ThemeConfig</span>&nbsp;=&nbsp;{'{'}
                      </div>
                      <div className="flex bg-rose-950/40 text-rose-200 px-1 py-0.5 rounded -mx-1">
                        <span className="w-6 text-rose-500/70 select-none">2</span>
                        <span>-&nbsp;&nbsp;surface:&nbsp;<span className="text-emerald-300">"sidebar"</span>,</span>
                      </div>
                      <div className="flex bg-rose-950/40 text-rose-200 px-1 py-0.5 rounded -mx-1">
                        <span className="w-6 text-rose-500/70 select-none">3</span>
                        <span>-&nbsp;&nbsp;accent:&nbsp;<span className="text-emerald-300">"#2563eb"</span>,</span>
                      </div>
                      <div className="flex bg-rose-950/40 text-rose-200 px-1 py-0.5 rounded -mx-1">
                        <span className="w-6 text-rose-500/70 select-none">4</span>
                        <span>-&nbsp;&nbsp;contrast:&nbsp;<span className="text-sky-300">42</span>,</span>
                      </div>
                      <div className="flex text-slate-400">
                        <span className="w-6 text-slate-600 select-none">5</span>
                        <span>{'};'}</span>
                      </div>
                    </div>

                    {/* Right Addition Diff (Green) */}
                    <div className="space-y-1 pl-3">
                      <div className="flex text-slate-400">
                        <span className="w-6 text-slate-600 select-none">1</span>
                        <span className="text-purple-400">const</span>&nbsp;<span className="text-amber-300">themePreview</span>:&nbsp;<span className="text-sky-300">ThemeConfig</span>&nbsp;=&nbsp;{'{'}
                      </div>
                      <div className="flex bg-emerald-950/40 text-emerald-200 px-1 py-0.5 rounded -mx-1">
                        <span className="w-6 text-emerald-500/70 select-none">2</span>
                        <span>+&nbsp;&nbsp;surface:&nbsp;<span className="text-emerald-300">"sidebar-elevated"</span>,</span>
                      </div>
                      <div className="flex bg-emerald-950/40 text-emerald-200 px-1 py-0.5 rounded -mx-1">
                        <span className="w-6 text-emerald-500/70 select-none">3</span>
                        <span>+&nbsp;&nbsp;accent:&nbsp;<span className="text-emerald-300">"{themeConfig.darkTheme.accent}"</span>,</span>
                      </div>
                      <div className="flex bg-emerald-950/40 text-emerald-200 px-1 py-0.5 rounded -mx-1">
                        <span className="w-6 text-emerald-500/70 select-none">4</span>
                        <span>+&nbsp;&nbsp;contrast:&nbsp;<span className="text-sky-300">{themeConfig.darkTheme.contrast}</span>,</span>
                      </div>
                      <div className="flex text-slate-400">
                        <span className="w-6 text-slate-600 select-none">5</span>
                        <span>{'};'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation footer */}
                  <div className="px-4 py-2 border-t border-white/[0.04] bg-[#141416] flex items-center justify-between text-slate-500 text-xs">
                    <button type="button" className="hover:text-white transition-colors cursor-pointer p-1">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-[11px] font-mono text-slate-500">Live Preview: Theme AST Diff</span>
                    <button type="button" className="hover:text-white transition-colors cursor-pointer p-1">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Section 3: Light Theme Card */}
                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Light theme</h3>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button" 
                        onClick={() => handleCopyTheme('light')}
                        className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Copy size={12} />
                        <span>{copyFeedback === 'light' ? 'Copied!' : 'Copy theme'}</span>
                      </button>
                      <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center text-[11px] font-bold">
                        Aa
                      </span>
                      <select
                        value={themeConfig.lightTheme.preset}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, preset: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="Codex">Codex</option>
                        <option value="GitHub Light">GitHub Light</option>
                        <option value="Solarized Light">Solarized Light</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.04]" />

                  {/* Accent Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Accent</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeConfig.lightTheme.accent}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, accent: e.target.value }
                        }))}
                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <span className="px-3 py-1 rounded-xl bg-sky-500 text-white font-mono text-xs font-semibold">
                        {themeConfig.lightTheme.accent.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Background Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Background</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeConfig.lightTheme.background}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, background: e.target.value }
                        }))}
                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <span className="px-3 py-1 rounded-xl bg-white text-black font-mono text-xs font-semibold border border-slate-300">
                        {themeConfig.lightTheme.background.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Foreground Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Foreground</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeConfig.lightTheme.foreground}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, foreground: e.target.value }
                        }))}
                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <span className="px-3 py-1 rounded-xl bg-[#1a1c1f] text-white font-mono text-xs font-semibold">
                        {themeConfig.lightTheme.foreground.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* UI Font */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">UI font</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={themeConfig.lightTheme.uiFont}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, uiFont: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="System default">System default</option>
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Geist">Geist</option>
                      </select>
                      <select
                        value={themeConfig.lightTheme.uiFontWeight}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, uiFontWeight: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Medium">Medium</option>
                        <option value="Bold">Bold</option>
                      </select>
                    </div>
                  </div>

                  {/* Code Font */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Code font</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={themeConfig.lightTheme.codeFont}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, codeFont: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="System default">System default</option>
                        <option value="Fira Code">Fira Code</option>
                        <option value="JetBrains Mono">JetBrains Mono</option>
                        <option value="Consolas">Consolas</option>
                      </select>
                      <select
                        value={themeConfig.lightTheme.codeFontWeight}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, codeFontWeight: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Medium">Medium</option>
                        <option value="Bold">Bold</option>
                      </select>
                    </div>
                  </div>

                  {/* Translucent Sidebar */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Translucent sidebar</span>
                    <input
                      type="checkbox"
                      checked={themeConfig.lightTheme.translucentSidebar}
                      onChange={(e) => updateThemeConfig(prev => ({
                        ...prev,
                        lightTheme: { ...prev.lightTheme, translucentSidebar: e.target.checked }
                      }))}
                      className="toggle-checkbox"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Contrast</span>
                    <div className="flex items-center gap-3 w-48">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={themeConfig.lightTheme.contrast}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, contrast: Number(e.target.value) }
                        }))}
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-400 w-6 text-right">
                        {themeConfig.lightTheme.contrast}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Dark Theme Card */}
                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Dark theme</h3>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button" 
                        onClick={() => handleCopyTheme('dark')}
                        className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Copy size={12} />
                        <span>{copyFeedback === 'dark' ? 'Copied!' : 'Copy theme'}</span>
                      </button>
                      <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center text-[11px] font-bold">
                        Aa
                      </span>
                      <select
                        value={themeConfig.darkTheme.preset}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, preset: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="Codex">Codex</option>
                        <option value="Obsidian Slate">Obsidian Slate</option>
                        <option value="Midnight Blue">Midnight Blue</option>
                        <option value="Pure Black OLED">Pure Black OLED</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.04]" />

                  {/* Accent Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Accent</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeConfig.darkTheme.accent}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, accent: e.target.value }
                        }))}
                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <span className="px-3 py-1 rounded-xl bg-sky-500 text-white font-mono text-xs font-semibold">
                        {themeConfig.darkTheme.accent.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Background Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Background</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeConfig.darkTheme.background}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, background: e.target.value }
                        }))}
                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <span className="px-3 py-1 rounded-xl bg-[#181818] text-white font-mono text-xs font-semibold border border-white/10">
                        {themeConfig.darkTheme.background.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Foreground Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Foreground</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={themeConfig.darkTheme.foreground}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, foreground: e.target.value }
                        }))}
                        className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                      />
                      <span className="px-3 py-1 rounded-xl bg-white text-black font-mono text-xs font-semibold">
                        {themeConfig.darkTheme.foreground.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* UI Font */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">UI font</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={themeConfig.darkTheme.uiFont}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, uiFont: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="System default">System default</option>
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Geist">Geist</option>
                      </select>
                      <select
                        value={themeConfig.darkTheme.uiFontWeight}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, uiFontWeight: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Medium">Medium</option>
                        <option value="Bold">Bold</option>
                      </select>
                    </div>
                  </div>

                  {/* Code Font */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Code font</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={themeConfig.darkTheme.codeFont}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, codeFont: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="System default">System default</option>
                        <option value="Fira Code">Fira Code</option>
                        <option value="JetBrains Mono">JetBrains Mono</option>
                        <option value="Consolas">Consolas</option>
                      </select>
                      <select
                        value={themeConfig.darkTheme.codeFontWeight}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, codeFontWeight: e.target.value }
                        }))}
                        className="bg-[#222227] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Medium">Medium</option>
                        <option value="Bold">Bold</option>
                      </select>
                    </div>
                  </div>

                  {/* Translucent Sidebar */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Translucent sidebar</span>
                    <input
                      type="checkbox"
                      checked={themeConfig.darkTheme.translucentSidebar}
                      onChange={(e) => updateThemeConfig(prev => ({
                        ...prev,
                        darkTheme: { ...prev.darkTheme, translucentSidebar: e.target.checked }
                      }))}
                      className="toggle-checkbox"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Contrast</span>
                    <div className="flex items-center gap-3 w-48">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={themeConfig.darkTheme.contrast}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, contrast: Number(e.target.value) }
                        }))}
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-400 w-6 text-right">
                        {themeConfig.darkTheme.contrast}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 5: Preferences Card */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">Preferences</h3>
                  <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                    
                    {/* Pointer cursors */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-medium text-white">Use pointer cursors</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Change the cursor to a pointer when hovering over interactive elements.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={themeConfig.preferences.usePointerCursors}
                        onChange={(e) => updateThemeConfig(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, usePointerCursors: e.target.checked }
                        }))}
                        className="toggle-checkbox"
                      />
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    {/* Reduce motion */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-medium text-white">Reduce motion</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Reduce animations or match your system.</p>
                      </div>
                      <div className="flex p-0.5 rounded-xl bg-[#222227] border border-white/10 text-xs">
                        {(['system', 'on', 'off'] as const).map(option => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => updateThemeConfig(prev => ({
                              ...prev,
                              preferences: { ...prev.preferences, reduceMotion: option }
                            }))}
                            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer capitalize ${
                              themeConfig.preferences.reduceMotion === option
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    {/* UI font size */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-medium text-white">UI font size</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Adjust the base size used for the VaultDoc UI.</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#222227] border border-white/10 rounded-xl px-3 py-1 text-xs">
                        <input
                          type="number"
                          min={11}
                          max={20}
                          value={themeConfig.preferences.uiFontSize}
                          onChange={(e) => updateThemeConfig(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, uiFontSize: Number(e.target.value) }
                          }))}
                          className="w-8 bg-transparent text-white font-mono outline-none text-right"
                        />
                        <span className="text-slate-500 font-mono text-[11px]">px</span>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    {/* Code font size */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-medium text-white">Code font size</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Adjust the base size used for code across chats and diffs.</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#222227] border border-white/10 rounded-xl px-3 py-1 text-xs">
                        <input
                          type="number"
                          min={10}
                          max={22}
                          value={themeConfig.preferences.codeFontSize}
                          onChange={(e) => updateThemeConfig(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, codeFontSize: Number(e.target.value) }
                          }))}
                          className="w-8 bg-transparent text-white font-mono outline-none text-right"
                        />
                        <span className="text-slate-500 font-mono text-[11px]">px</span>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    {/* Diff markers */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-medium text-white">Diff markers</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Show changes using colors or +/- markers.</p>
                      </div>
                      <div className="flex p-0.5 rounded-xl bg-[#222227] border border-white/10 text-xs">
                        {(['color', '+/-'] as const).map(marker => (
                          <button
                            key={marker}
                            type="button"
                            onClick={() => updateThemeConfig(prev => ({
                              ...prev,
                              preferences: { ...prev.preferences, diffMarkers: marker }
                            }))}
                            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer capitalize ${
                              themeConfig.preferences.diffMarkers === marker
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {marker === 'color' ? 'Color' : '+/-'}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* 3. KEYBOARD SHORTCUTS */}
            {activeCategory === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">Keyboard Shortcuts</h1>
                  <p className="text-xs text-slate-400 mt-1">Accelerate your workflow with global keyboard commands.</p>
                </div>

                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5">
                  <div className="divide-y divide-white/[0.04]">
                    {[
                      { action: 'Toggle Navigation Sidebar', key: 'Ctrl + B' },
                      { action: 'Command Bar / Quick Focus', key: 'Ctrl + K' },
                      { action: 'Run Pre-PR Audit Scan', key: 'Ctrl + Enter' },
                      { action: 'Open Workspace Settings', key: 'Ctrl + ,' },
                      { action: 'New Chat Session', key: 'Ctrl + N' },
                      { action: 'Help & Changelog', key: 'Ctrl + /' },
                    ].map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3">
                        <span className="text-xs text-slate-300">{s.action}</span>
                        <kbd className="px-2.5 py-1 bg-[#222227] border border-white/10 rounded-lg text-xs font-mono text-slate-300">
                          {s.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. LOCAL MODEL RUNTIME */}
            {activeCategory === 'model' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">Local Model Runtime</h1>
                  <p className="text-xs text-slate-400 mt-1">Connect directly to local inference backends (Ollama, LM Studio, vLLM).</p>
                </div>

                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                  
                  {/* Endpoint URL Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Endpoint Base URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.baseUrl}
                        onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                        placeholder="http://localhost:11434"
                        className="flex-1 bg-[#222227] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleFetchModels()}
                        disabled={isFetchingModels}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={13} className={isFetchingModels ? 'animate-spin' : ''} />
                        <span>Discover</span>
                      </button>
                    </div>
                    {fetchStatus && (
                      <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${fetchStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fetchStatus.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
                        <span>{fetchStatus.message}</span>
                      </p>
                    )}
                  </div>

                  <div className="border-t border-white/[0.04]" />

                  {/* Active Model Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Active Model
                    </label>
                    <select
                      value={config.model}
                      onChange={(e) => {
                        setConfig({ ...config, model: e.target.value });
                      }}
                      className="w-full bg-[#222227] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none cursor-pointer"
                    >
                      {availableModels.length > 0 ? (
                        availableModels.map(m => <option key={m} value={m}>{m}</option>)
                      ) : (
                        <>
                          <option value="qwen2.5-coder:7b">qwen2.5-coder:7b</option>
                          <option value="deepseek-coder-v2">deepseek-coder-v2</option>
                          <option value="llama3.1">llama3.1</option>
                          <option value="5.6 Terra Medium">5.6 Terra Medium</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="border-t border-white/[0.04]" />

                  {/* Context Window Size Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-300">Context Window Size</label>
                      <span className="text-xs font-mono text-sky-400">{contextWindow.toLocaleString()} tokens</span>
                    </div>
                    <input
                      type="range"
                      min={4096}
                      max={32768}
                      step={4096}
                      value={contextWindow}
                      onChange={(e) => setContextWindow(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>4k</span>
                      <span>8k</span>
                      <span>16k</span>
                      <span>32k</span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.04]" />

                  {/* GPU Offload Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-white">GPU Acceleration (CUDA / Metal)</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Offload layers directly to local VRAM for 0-latency token generation.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={gpuOffload}
                      onChange={(e) => setGpuOffload(e.target.checked)}
                      className="toggle-checkbox"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveModelConfig}
                      className="px-4 py-2 bg-white text-black hover:bg-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
                    >
                      Save Configuration
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* 5. LANCEDB VECTOR STORAGE */}
            {activeCategory === 'vector' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">LanceDB Vector Storage</h1>
                  <p className="text-xs text-slate-400 mt-1">Air-gapped local vector database powering AST similarity searches.</p>
                </div>

                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                  
                  {/* Local Disk Directory */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Local Cache Directory</label>
                    <div className="bg-[#222227] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-300 flex items-center justify-between">
                      <span className="truncate">{vectorCachePath}</span>
                      <Folder size={14} className="text-slate-500 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="border-t border-white/[0.04]" />

                  {/* Embedding Model */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Embedding Model</label>
                    <select
                      value={embeddingModel}
                      onChange={(e) => setEmbeddingModel(e.target.value)}
                      className="w-full bg-[#222227] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none cursor-pointer"
                    >
                      <option value="nomic-embed-text">nomic-embed-text (512-dim, Fast)</option>
                      <option value="bge-small-en-v1.5">bge-small-en-v1.5 (384-dim, Accurate)</option>
                      <option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2 (384-dim)</option>
                    </select>
                  </div>

                  <div className="border-t border-white/[0.04]" />

                  {/* One-Click Maintenance Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={isClearingCache}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>{isClearingCache ? 'Clearing...' : 'Clear Vector Cache'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReindex}
                      disabled={isReindexing}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={13} className={isReindexing ? 'animate-spin' : ''} />
                      <span>{isReindexing ? 'Re-indexing...' : 'Re-index Entire Codebase'}</span>
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* 6. TREE-SITTER AST PARSERS */}
            {activeCategory === 'ast' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">Tree-sitter AST Parsers</h1>
                  <p className="text-xs text-slate-400 mt-1">Enable or disable high-precision multi-language AST extraction grammars.</p>
                </div>

                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5">
                  <div className="divide-y divide-white/[0.04]">
                    {[
                      { id: 'python', label: 'Python (3.9 - 3.12 grammar)' },
                      { id: 'typescript', label: 'TypeScript & JavaScript (ESNext / JSX)' },
                      { id: 'rust', label: 'Rust (2024 Edition)' },
                      { id: 'go', label: 'Go (Modules & Generics)' },
                      { id: 'sql', label: 'SQL (PostgreSQL / SQLite schemas)' },
                      { id: 'cpp', label: 'C++ / C Header symbols' },
                      { id: 'java', label: 'Java (Spring & Jakarta bindings)' }
                    ].map(lang => (
                      <div key={lang.id} className="flex items-center justify-between py-3">
                        <div>
                          <h4 className="text-xs font-medium text-white">{lang.label}</h4>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!astLanguages[lang.id]}
                          onChange={() => toggleLanguage(lang.id)}
                          className="toggle-checkbox"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 7. GITHUB LOCAL-FIRST PAT */}
            {activeCategory === 'github' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">GitHub Local-First PAT</h1>
                  <p className="text-xs text-slate-400 mt-1">Direct client-to-GitHub synchronization without intermediate proxies.</p>
                </div>

                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                  
                  {/* PAT Token Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Fine-Grained Personal Access Token (PAT)
                    </label>
                    <div className="relative">
                      <input
                        type={showGitHubToken ? 'text' : 'password'}
                        value={gitHubConfig.pat}
                        onChange={(e) => setGitHubConfig({ ...gitHubConfig, pat: e.target.value })}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-[#222227] border border-white/10 rounded-xl pl-3.5 pr-10 py-2 text-xs font-mono text-white outline-none focus:border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGitHubToken(!showGitHubToken)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                      >
                        {showGitHubToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Scopes Badge Verification */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-300 mb-2">Required Token Scopes</h4>
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                        <Check size={11} /> repo:read
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                        <Check size={11} /> pull_requests:write
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.04]" />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-white">Direct Local Dispatch</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Dispatches review comments directly from your machine to api.github.com.</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                      Zero-Proxy
                    </span>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveGitHubConfig}
                      className="px-4 py-2 bg-white text-black hover:bg-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
                    >
                      Save GitHub Settings
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* 8. IDE & EXTENSIONS BRIDGE */}
            {activeCategory === 'extensions' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">IDE & Extensions Bridge</h1>
                  <p className="text-xs text-slate-400 mt-1">Live WebSocket and IPC connection status with VS Code / Cursor plugins.</p>
                </div>

                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Puzzle size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-white">VS Code / Cursor Extension Socket</h4>
                        <p className="text-[11px] text-slate-400">Local Loopback Bridge: <span className="font-mono text-slate-300">ws://127.0.0.1:45812</span></p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Listening
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 9. TERMINAL CLI & GIT HOOKS */}
            {activeCategory === 'hooks' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">Terminal CLI & Git Hooks</h1>
                  <p className="text-xs text-slate-400 mt-1">Install automated shift-left pre-commit audit scanners into your Git repo.</p>
                </div>

                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-white">Pre-Commit Shift-Left Scanner</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Blocks commits with detected secret leaks or breaking schema changes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHookInstalled(true)}
                      disabled={hookInstalled}
                      className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        hookInstalled 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-white text-black hover:bg-slate-200'
                      }`}
                    >
                      {hookInstalled ? '✓ Hook Installed' : 'Install Pre-Commit Hook'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 10. ZERO-EGRESS AIR-GAP POLICY */}
            {activeCategory === 'security' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">Zero-Egress Air-Gap Policy</h1>
                  <p className="text-xs text-slate-400 mt-1">Network egress monitoring and local automated secret masking filters.</p>
                </div>

                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-5">
                  
                  {/* Network Egress Live Monitor */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-white">Network Egress Monitor</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Real-time socket verification of zero outbound telemetry packets.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1.5">
                      <ShieldCheck size={13} />
                      0 Outbound Packets
                    </span>
                  </div>

                  <div className="border-t border-white/[0.04]" />

                  {/* Secret Redaction Filters */}
                  <div className="flex items-center justify-between">
                    <div className="pr-4">
                      <h4 className="text-xs font-medium text-white">Secret Redaction Filters</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Automatically masks .env tokens, AWS keys, and database passwords before AST indexing.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={secretRedaction}
                      onChange={(e) => setSecretRedaction(e.target.checked)}
                      className="toggle-checkbox"
                    />
                  </div>

                </div>
              </div>
            )}

            {/* 11. AUDIT & ACTION LOGS */}
            {activeCategory === 'logs' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-medium text-white tracking-tight">Audit & Action Logs</h1>
                  <p className="text-xs text-slate-400 mt-1">Review localized audit traces and offline token usage metrics.</p>
                </div>

                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="bg-[#222227] p-3.5 rounded-xl border border-white/5">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Total Offline Invocations</div>
                      <div className="text-xl font-bold text-white font-mono mt-1">1,428</div>
                    </div>
                    <div className="bg-[#222227] p-3.5 rounded-xl border border-white/5">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Data Transferred Externally</div>
                      <div className="text-xl font-bold text-emerald-400 font-mono mt-1">0.00 KB</div>
                    </div>
                  </div>

                  <div className="divide-y divide-white/[0.04] text-xs font-mono text-slate-400">
                    <div className="py-2 flex justify-between">
                      <span>[AST_INDEX_COMMIT] Synced 356 symbols</span>
                      <span className="text-slate-500">2 mins ago</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span>[LOCAL_INFERENCE] qwen2.5-coder generated 412 tokens</span>
                      <span className="text-slate-500">8 mins ago</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span>[PRE_PR_SCAN] Zero security vulnerabilities</span>
                      <span className="text-slate-500">22 mins ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

      </div>
    </div>
  );
};

export default SettingsModal;
