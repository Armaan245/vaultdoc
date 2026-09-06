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
  ChevronRight,
  User,
  ChevronDown,
  Share,
  Lock,
  Edit2,
  Pencil,
  X,
  Download,
  Globe,
  Archive,
  RotateCcw
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
import { 
  type ChatSession, 
  getStoredChatSessions, 
  unarchiveChatSession, 
  deleteChatSession,
  saveStoredActiveSessionId
} from '../services/chatSessions';
import { 
  startSidecar, 
  stopSidecar, 
  checkSidecarHealth, 
  subscribeSidecar, 
  type OllamaSidecarStatus 
} from '../services/sidecar';

interface SettingsProps {
  activeMode: 1 | 2;
  setActiveMode: (mode: 1 | 2) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
  initialCategory?: SettingCategory;
}

interface CustomSelectOption {
  label: string;
  value: string;
}

const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  className = '',
  widthClass = 'w-44'
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: (string | CustomSelectOption)[];
  className?: string;
  widthClass?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedOptions: CustomSelectOption[] = options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const selectedOption = normalizedOptions.find(o => o.value === value) || { label: value, value };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`custom-dropdown-btn flex items-center justify-between gap-2.5 rounded-xl px-3 py-1.5 text-xs outline-none transition-colors cursor-pointer ${widthClass}`}
      >
        <span className="font-normal truncate text-left">{selectedOption.label}</span>
        <ChevronDown size={13} className="text-slate-400 shrink-0" />
      </button>
      
      {isOpen && (
        <div className={`custom-dropdown-menu absolute right-0 top-full mt-1.5 rounded-xl py-1.5 z-50 overflow-hidden shadow-2xl animate-fadeIn ${widthClass === 'w-full' ? 'w-full' : (widthClass.startsWith('w-') ? widthClass : 'min-w-[170px]')}`}>
          {normalizedOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className="custom-dropdown-item flex items-center justify-between w-full px-3.5 py-2 text-xs text-left transition-colors cursor-pointer"
            >
              <span className={`truncate ${value === opt.value ? 'font-medium' : 'font-normal'}`}>{opt.label}</span>
              {value === opt.value && <Check size={13} className="shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

type SettingCategory = 
  | 'general'
  | 'profile'
  | 'archived'
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
  onClose,
  initialCategory
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingCategory>(initialCategory || 'general');
  const [searchQuery, setSearchQuery] = useState('');
  const contentMainRef = React.useRef<HTMLElement>(null);

  // Archived Chats State
  const [archivedSessions, setArchivedSessions] = useState<ChatSession[]>(() => 
    getStoredChatSessions().filter(s => s.isArchived)
  );
  const [archivedSearch, setArchivedSearch] = useState<string>('');

  React.useEffect(() => {
    const handleSessionsSync = () => {
      setArchivedSessions(getStoredChatSessions().filter(s => s.isArchived));
    };
    window.addEventListener('vaultdoc_sessions_change', handleSessionsSync);
    return () => window.removeEventListener('vaultdoc_sessions_change', handleSessionsSync);
  }, []);

  React.useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  React.useEffect(() => {
    contentMainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeCategory]);

  // AI Model State
  const [config, setConfig] = useState<ProviderConfig>(getStoredProviderConfig);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [fetchStatus, setFetchStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [contextWindow, setContextWindow] = useState<number>(16384);
  const [gpuOffload, setGpuOffload] = useState<boolean>(true);
  const [sidecarStatus, setSidecarStatus] = useState<OllamaSidecarStatus>({
    isRunning: false,
    isBundled: false,
    status: 'starting',
    port: 11434,
    endpoint: 'http://localhost:11434',
    models: [],
    message: 'Checking inference engine...',
    lastChecked: new Date(),
  });
  const [isSidecarActionRunning, setIsSidecarActionRunning] = useState(false);

  React.useEffect(() => {
    const unsub = subscribeSidecar((status) => {
      setSidecarStatus(status);
      if (status.models.length > 0 && availableModels.length === 0) {
        setAvailableModels(status.models);
      }
    });
    return () => unsub();
  }, []);

  // GitHub State
  const [gitHubConfig, setGitHubConfig] = useState<GitHubConfig>(getStoredGitHubConfig);
  const [showGitHubToken, setShowGitHubToken] = useState<boolean>(false);

  // User Profile State
  const [displayName, setDisplayName] = useState<string>(() => localStorage.getItem('vaultdoc_profile_name') || 'Armaan Mujawar');
  const [username, setUsername] = useState<string>(() => localStorage.getItem('vaultdoc_profile_username') || '@armujawar245');
  const [isPrivate, setIsPrivate] = useState<boolean>(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [editDisplayName, setEditDisplayName] = useState<string>('Armaan Mujawar');
  const [editUsername, setEditUsername] = useState<string>('@armujawar245');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'AM';
  };

  const handleOpenEdit = () => {
    setEditDisplayName(displayName);
    setEditUsername(username);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = () => {
    const trimmedName = editDisplayName.trim() || 'User';
    const formattedUsername = editUsername.trim().startsWith('@') 
      ? editUsername.trim() 
      : `@${editUsername.trim() || 'user'}`;
    
    setDisplayName(trimmedName);
    setUsername(formattedUsername);
    localStorage.setItem('vaultdoc_profile_name', trimmedName);
    localStorage.setItem('vaultdoc_profile_username', formattedUsername);
    setIsEditProfileOpen(false);
  };

  const handleSharePlatform = (platform: string) => {
    setShareFeedback(platform);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`Check out my coding activity on VaultDoc: https://vaultdoc.dev/u/${username.replace('@', '')}`);
    }
    setTimeout(() => setShareFeedback(null), 2000);
  };

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

  const handleRestoreArchived = (sessionId: string) => {
    unarchiveChatSession(sessionId);
  };

  const handleRestoreAllArchived = () => {
    archivedSessions.forEach(s => unarchiveChatSession(s.id));
  };

  const handleDeleteArchived = (sessionId: string) => {
    deleteChatSession(sessionId);
  };

  const handleOpenArchived = (sessionId: string) => {
    unarchiveChatSession(sessionId);
    saveStoredActiveSessionId(sessionId);
    onClose();
  };

  const navCategories = [
    {
      group: 'PERSONAL',
      items: [
        { id: 'general' as SettingCategory, label: 'General', icon: Settings },
        { id: 'profile' as SettingCategory, label: 'Profile', icon: User },
        { id: 'archived' as SettingCategory, label: 'Archived Chats', icon: Archive },
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
        <main ref={contentMainRef} className="flex-1 h-full overflow-y-auto custom-scrollbar bg-[#111114] p-8">
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
                      <CustomSelect 
                        value={defaultEditor}
                        onChange={(val) => setDefaultEditor(val)}
                        options={['Antigravity Studio', 'VS Code', 'Cursor', 'Built-in Viewer']}
                      />
                    </div>

                    <div className="border-t border-white/[0.04]" />

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-medium text-white">Integrated Terminal Shell</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Shell used for test execution and CLI script tasks.</p>
                      </div>
                      <CustomSelect 
                        value={terminalShell}
                        onChange={(val) => setTerminalShell(val)}
                        options={['PowerShell', 'Command Prompt', 'Git Bash', 'WSL']}
                      />
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* PROFILE SECTION */}
            {activeCategory === 'profile' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-medium text-white tracking-tight">Profile</h1>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                    <button 
                      type="button" 
                      onClick={() => setIsShareModalOpen(true)}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <Share size={14} />
                      <span>Share</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsPrivate(prev => !prev)}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      {isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                      <span>{isPrivate ? 'Private' : 'Public'}</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={handleOpenEdit}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center pt-3 pb-2 space-y-3">
                  <div className="w-20 h-20 rounded-full bg-[#10a37f] flex items-center justify-center text-2xl font-semibold text-white shadow-md">
                    {getInitials(displayName)}
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-medium text-white">{displayName}</h2>
                    <p className="text-xs text-slate-400 mt-1">{username} · <span className="text-slate-400">Free</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3.5 max-w-2xl mx-auto">
                  <div className="bg-[#18181c] border border-white/5 rounded-2xl p-4 text-center">
                    <div className="text-xl font-semibold text-white">0</div>
                    <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Lifetime tokens</div>
                  </div>
                  <div className="bg-[#18181c] border border-white/5 rounded-2xl p-4 text-center">
                    <div className="text-xl font-semibold text-white">0</div>
                    <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Peak tokens</div>
                  </div>
                  <div className="bg-[#18181c] border border-white/5 rounded-2xl p-4 text-center">
                    <div className="text-xl font-semibold text-white">0<span className="text-xs font-normal text-slate-400 ml-1">days</span></div>
                    <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Current streak</div>
                  </div>
                  <div className="bg-[#18181c] border border-white/5 rounded-2xl p-4 text-center">
                    <div className="text-xl font-semibold text-white">0<span className="text-xs font-normal text-slate-400 ml-1">days</span></div>
                    <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Longest streak</div>
                  </div>
                </div>

                {/* Token Activity & Insights */}
                <div className="max-w-2xl mx-auto space-y-8 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-white">Token activity</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <button type="button" className="text-white font-medium cursor-pointer">Daily</button>
                        <button type="button" className="hover:text-slate-300 cursor-pointer">Weekly</button>
                        <button type="button" className="hover:text-slate-300 cursor-pointer">Cumulative</button>
                      </div>
                    </div>
                    {/* Token activity graph */}
                    <div className="profile-activity-card rounded-2xl p-4 flex flex-col justify-between h-36 border">
                      <div className="grid grid-cols-[repeat(52,minmax(0,1fr))] grid-rows-7 gap-[3px] w-full h-[76px]">
                        {Array.from({ length: 364 }).map((_, i) => (
                          <div key={i} className="profile-grid-dot rounded-[2px] transition-colors" />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-sans pt-2 px-1">
                        <span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xs font-semibold text-white mb-4">Activity insights</h3>
                      <div className="space-y-3.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Fast Mode</span>
                          <span className="text-slate-400 font-normal">Not used</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Most used reasoning</span>
                          <span className="text-slate-400 font-normal">Not used</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Skills explored</span>
                          <span className="text-slate-400 font-normal">None</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Total skills used</span>
                          <span className="text-slate-400 font-normal">None</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Total chats</span>
                          <span className="text-slate-400 font-normal">None</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold text-white mb-4">Most used plugins</h3>
                      <div className="profile-plugins-card border rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[160px]">
                        <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-white/20 flex items-center justify-center text-[10px] text-slate-400 mb-2">@</div>
                        <p className="text-xs text-slate-400">No plugins used yet · <button type="button" className="text-slate-600 dark:text-slate-300 hover:underline cursor-pointer">Browse</button></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ARCHIVED CHATS */}
            {activeCategory === 'archived' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-medium text-white tracking-tight">Archived Chats</h1>
                    <p className="text-xs text-slate-400 mt-1">
                      View, restore, or permanently remove chat sessions you have archived.
                    </p>
                  </div>
                  {archivedSessions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRestoreAllArchived}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13} className="text-amber-400" />
                      <span>Restore All</span>
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Search size={14} />
                  </div>
                  <input
                    type="text"
                    value={archivedSearch}
                    onChange={(e) => setArchivedSearch(e.target.value)}
                    placeholder="Search archived chats by title or project..."
                    className="w-full bg-[#18181c] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500/50 transition-colors"
                  />
                </div>

                {/* Archived List */}
                <div className="space-y-2.5">
                  {archivedSessions.length === 0 ? (
                    <div className="bg-[#18181c] border border-white/5 rounded-2xl p-12 text-center">
                      <Archive size={36} className="mx-auto mb-3 text-slate-600" />
                      <h3 className="text-sm font-medium text-white">No archived chats</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        When you archive a chat from your Projects or Recents sidebar, it will be safely kept here.
                      </p>
                    </div>
                  ) : (
                    archivedSessions
                      .filter(s => {
                        if (!archivedSearch.trim()) return true;
                        const q = archivedSearch.toLowerCase();
                        return s.title.toLowerCase().includes(q) || (s.projectId && s.projectId.toLowerCase().includes(q));
                      })
                      .map(session => (
                        <div
                          key={session.id}
                          className="bg-[#18181c] border border-white/[0.06] hover:border-white/15 rounded-2xl p-4 flex items-center justify-between transition-all group"
                        >
                          <div className="min-w-0 flex-1 mr-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-medium text-white truncate">{session.title}</span>
                              {session.projectId && session.projectId !== 'general' && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                  {session.projectId}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                              <span>{session.messages?.length || 0} messages</span>
                              <span>•</span>
                              <span>Updated {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Restore Button */}
                            <button
                              type="button"
                              onClick={() => handleRestoreArchived(session.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
                              title="Restore to active sidebar"
                            >
                              <RotateCcw size={13} className="text-amber-400" />
                              <span>Restore</span>
                            </button>

                            {/* Open Chat */}
                            <button
                              type="button"
                              onClick={() => handleOpenArchived(session.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-xs text-slate-950 font-medium transition-colors cursor-pointer shadow-sm active:scale-95"
                              title="Restore and open chat"
                            >
                              <span>Open</span>
                            </button>

                            {/* Delete Permanently */}
                            <button
                              type="button"
                              onClick={() => handleDeleteArchived(session.id)}
                              className="p-2 rounded-xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
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
                      <CustomSelect
                        value={themeConfig.lightTheme.preset}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, preset: val }
                        }))}
                        options={['Codex', 'GitHub Light', 'Solarized Light']}
                        widthClass="w-36"
                      />
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
                      <CustomSelect
                        value={themeConfig.lightTheme.uiFont}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, uiFont: val }
                        }))}
                        options={['System default', 'Inter', 'Roboto', 'Geist']}
                        widthClass="w-36"
                      />
                      <CustomSelect
                        value={themeConfig.lightTheme.uiFontWeight}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, uiFontWeight: val }
                        }))}
                        options={['Regular', 'Medium', 'Bold']}
                        widthClass="w-28"
                      />
                    </div>
                  </div>

                  {/* Code Font */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Code font</span>
                    <div className="flex items-center gap-2">
                      <CustomSelect
                        value={themeConfig.lightTheme.codeFont}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, codeFont: val }
                        }))}
                        options={['System default', 'Fira Code', 'JetBrains Mono', 'Consolas']}
                        widthClass="w-36"
                      />
                      <CustomSelect
                        value={themeConfig.lightTheme.codeFontWeight}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          lightTheme: { ...prev.lightTheme, codeFontWeight: val }
                        }))}
                        options={['Regular', 'Medium', 'Bold']}
                        widthClass="w-28"
                      />
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
                      <CustomSelect
                        value={themeConfig.darkTheme.preset}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, preset: val }
                        }))}
                        options={['Codex', 'Obsidian Slate', 'Midnight Blue', 'Pure Black OLED']}
                        widthClass="w-40"
                      />
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
                      <CustomSelect
                        value={themeConfig.darkTheme.uiFont}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, uiFont: val }
                        }))}
                        options={['System default', 'Inter', 'Roboto', 'Geist']}
                        widthClass="w-36"
                      />
                      <CustomSelect
                        value={themeConfig.darkTheme.uiFontWeight}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, uiFontWeight: val }
                        }))}
                        options={['Regular', 'Medium', 'Bold']}
                        widthClass="w-28"
                      />
                    </div>
                  </div>

                  {/* Code Font */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Code font</span>
                    <div className="flex items-center gap-2">
                      <CustomSelect
                        value={themeConfig.darkTheme.codeFont}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, codeFont: val }
                        }))}
                        options={['System default', 'Fira Code', 'JetBrains Mono', 'Consolas']}
                        widthClass="w-36"
                      />
                      <CustomSelect
                        value={themeConfig.darkTheme.codeFontWeight}
                        onChange={(val) => updateThemeConfig(prev => ({
                          ...prev,
                          darkTheme: { ...prev.darkTheme, codeFontWeight: val }
                        }))}
                        options={['Regular', 'Medium', 'Bold']}
                        widthClass="w-28"
                      />
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

                {/* Sidecar Daemon & Inference Manager Card */}
                <div className="bg-[#18181c] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${sidecarStatus.isRunning ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        <Cpu size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">Ollama Local Inference Sidecar</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            sidecarStatus.isRunning 
                              ? (sidecarStatus.isBundled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400')
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}>
                            {sidecarStatus.isRunning ? (sidecarStatus.isBundled ? 'BUNDLED SIDECAR' : 'SYSTEM SERVICE') : 'OFFLINE'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {sidecarStatus.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSidecarActionRunning}
                        onClick={async () => {
                          setIsSidecarActionRunning(true);
                          try {
                            if (sidecarStatus.isRunning && sidecarStatus.isBundled) {
                              await stopSidecar();
                            } else {
                              await startSidecar();
                            }
                            await handleFetchModels(config);
                          } finally {
                            setIsSidecarActionRunning(false);
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                          sidecarStatus.isRunning && sidecarStatus.isBundled
                            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                            : 'bg-sky-600/20 border border-sky-500/30 text-sky-300 hover:bg-sky-600/30'
                        }`}
                      >
                        <RefreshCw size={12} className={isSidecarActionRunning ? 'animate-spin' : ''} />
                        <span>{sidecarStatus.isRunning && sidecarStatus.isBundled ? 'Stop Sidecar' : 'Start Sidecar'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSidecarActionRunning}
                        onClick={async () => {
                          setIsSidecarActionRunning(true);
                          try {
                            await checkSidecarHealth();
                            await handleFetchModels(config);
                          } finally {
                            setIsSidecarActionRunning(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-medium transition-all cursor-pointer"
                        title="Ping localhost:11434"
                      >
                        Health Check
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="bg-[#222227] border border-white/[0.04] rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Status</span>
                      <span className={`font-medium ${sidecarStatus.isRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {sidecarStatus.isRunning ? 'Ready on port 11434' : 'Not running'}
                      </span>
                    </div>
                    <div className="bg-[#222227] border border-white/[0.04] rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Local Models</span>
                      <span className="text-white font-medium">
                        {sidecarStatus.models.length} installed
                      </span>
                    </div>
                    <div className="bg-[#222227] border border-white/[0.04] rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Lifecycle</span>
                      <span className="text-slate-300 font-medium">
                        Auto-terminate on quit
                      </span>
                    </div>
                  </div>
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
                    <CustomSelect
                      value={config.model}
                      onChange={(val) => setConfig({ ...config, model: val })}
                      options={availableModels.length > 0 ? availableModels : ['qwen2.5-coder:7b', 'deepseek-coder-v2', 'llama3.1', '5.6 Terra Medium']}
                      widthClass="w-full"
                    />
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
                    <CustomSelect
                      value={embeddingModel}
                      onChange={(val) => setEmbeddingModel(val)}
                      options={[
                        { label: 'nomic-embed-text (512-dim, Fast)', value: 'nomic-embed-text' },
                        { label: 'bge-small-en-v1.5 (384-dim, Accurate)', value: 'bge-small-en-v1.5' },
                        { label: 'all-MiniLM-L6-v2 (384-dim)', value: 'all-MiniLM-L6-v2' }
                      ]}
                      widthClass="w-full"
                    />
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
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Listening</span>
                    </div>
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

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="profile-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="profile-modal-card rounded-3xl p-6 shadow-2xl w-full max-w-[460px] space-y-6 animate-scaleIn">
            <h2 className="text-base font-semibold">Edit profile</h2>
            
            {/* Center Avatar with Pencil Badge */}
            <div className="flex justify-center pt-1">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-[#10a37f] flex items-center justify-center text-3xl font-semibold text-white shadow-md">
                  {getInitials(editDisplayName)}
                </div>
                <button
                  type="button"
                  title="Change avatar"
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#10a37f] hover:bg-[#0d8a6b] text-white flex items-center justify-center border-2 border-white dark:border-[#1c1c20] shadow-sm cursor-pointer transition-transform hover:scale-105"
                >
                  <Pencil size={12} />
                </button>
              </div>
            </div>

            {/* Form Fields Card */}
            <div className="profile-modal-inner rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-normal opacity-70 shrink-0">Display name</label>
                <input 
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="profile-modal-input rounded-xl px-3.5 py-1.5 text-xs outline-none w-56 text-left transition-colors shadow-sm font-normal"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-normal opacity-70 shrink-0">Username</label>
                <input 
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="@username"
                  className="profile-modal-input rounded-xl px-3.5 py-1.5 text-xs outline-none w-56 text-left transition-colors shadow-sm font-normal"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button 
                type="button" 
                onClick={() => setIsEditProfileOpen(false)}
                className="profile-modal-btn-cancel px-4 py-2 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveProfile}
                className="profile-modal-btn-save px-5 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Activity Modal */}
      {isShareModalOpen && (
        <div className="share-modal-overlay fixed inset-0 z-50 flex flex-col items-center justify-center p-6 animate-fadeIn">
          {/* Close Button */}
          <button 
            type="button"
            onClick={() => setIsShareModalOpen(false)}
            className="absolute top-6 right-6 p-2.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer rounded-full"
          >
            <X size={22} />
          </button>

          <h2 className="text-xl font-medium mb-8 tracking-tight">Share your activity</h2>

          {/* Activity Share Preview Card */}
          <div className="share-modal-card w-full max-w-[460px] rounded-3xl p-6 shadow-2xl space-y-6 animate-scaleIn">
            
            {/* Header Identity Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#10a37f] flex items-center justify-center text-sm font-semibold text-white shadow-sm">
                  {getInitials(displayName)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{displayName}</h3>
                  <p className="text-xs opacity-60">{username}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-medium text-xs">
                <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>VaultDoc</span>
              </div>
            </div>

            {/* Contribution Grid Preview */}
            <div className="grid grid-cols-[repeat(26,minmax(0,1fr))] grid-rows-7 gap-[3px] py-2">
              {Array.from({ length: 182 }).map((_, i) => (
                <div key={i} className="profile-grid-dot h-2.5 rounded-[2px]" />
              ))}
            </div>

            {/* Bottom Metrics Bar */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-black/5 dark:border-white/5 text-center">
              <div>
                <div className="text-sm font-semibold">0</div>
                <div className="text-[10px] opacity-60 mt-0.5 lowercase font-normal">lifetime tokens</div>
              </div>
              <div>
                <div className="text-sm font-semibold">0</div>
                <div className="text-[10px] opacity-60 mt-0.5 lowercase font-normal">peak day</div>
              </div>
              <div>
                <div className="text-sm font-semibold">0 days</div>
                <div className="text-[10px] opacity-60 mt-0.5 lowercase font-normal">current streak</div>
              </div>
              <div>
                <div className="text-sm font-semibold">0 days</div>
                <div className="text-[10px] opacity-60 mt-0.5 lowercase font-normal">longest streak</div>
              </div>
            </div>

          </div>

          {/* Social Platform Icons */}
          <div className="flex items-center gap-6 mt-8">
            {/* X */}
            <button 
              type="button" 
              onClick={() => handleSharePlatform('X')}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="share-social-icon w-12 h-12 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-xs opacity-70 group-hover:opacity-100 transition-opacity">
                {shareFeedback === 'X' ? 'Copied!' : 'X'}
              </span>
            </button>

            {/* LinkedIn */}
            <button 
              type="button" 
              onClick={() => handleSharePlatform('LinkedIn')}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="share-social-icon w-12 h-12 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <span className="text-xs opacity-70 group-hover:opacity-100 transition-opacity">
                {shareFeedback === 'LinkedIn' ? 'Copied!' : 'LinkedIn'}
              </span>
            </button>

            {/* Reddit */}
            <button 
              type="button" 
              onClick={() => handleSharePlatform('Reddit')}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="share-social-icon w-12 h-12 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.56 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z"/>
                </svg>
              </div>
              <span className="text-xs opacity-70 group-hover:opacity-100 transition-opacity">
                {shareFeedback === 'Reddit' ? 'Copied!' : 'Reddit'}
              </span>
            </button>

            {/* Save */}
            <button 
              type="button" 
              onClick={() => handleSharePlatform('Save')}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="share-social-icon w-12 h-12 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Download size={20} />
              </div>
              <span className="text-xs opacity-70 group-hover:opacity-100 transition-opacity">
                {shareFeedback === 'Save' ? 'Saved!' : 'Save'}
              </span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default SettingsModal;
