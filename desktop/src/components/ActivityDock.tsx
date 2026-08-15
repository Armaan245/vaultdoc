import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  MessageSquarePlus, 
  GitPullRequest, 
  Clock, 
  Layers, 
  Folder, 
  HelpCircle,
  Plus,
  ExternalLink,
  Zap,
  Terminal,
  Keyboard,
  ShieldCheck,
  Puzzle,
  ChevronRight,
  Settings,
  Shield,
  Cpu,
  LogOut,
  Database,
  Check
} from 'lucide-react';

export type ActivityTab = 'chat' | 'docs' | 'architecture' | 'spec' | 'audit' | 'tests' | 'git';

interface ActivityDockProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  activeProject?: string;
  projects?: { id: string; name: string }[];
  onSelectProject?: (project: string) => void;
  onOpenFolder?: () => void;
  onOpenSettings?: () => void;
  onSelectRecent?: (recentPrompt: string) => void;
  onNewSession?: () => void;
}

export const ActivityDock = ({
  activeTab,
  onTabChange,
  activeProject = 'DATADUKAN_PRO',
  projects = [
    { id: 'DATADUKAN_PRO', name: 'DATADUKAN_PRO' },
    { id: 'EVO_RETAIL', name: 'EVO_RETAIL' }
  ],
  onSelectProject,
  onOpenFolder,
  onOpenSettings,
  onSelectRecent,
  onNewSession
}: ActivityDockProps) => {
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { id: 'chat' as ActivityTab, label: 'New chat', icon: MessageSquarePlus, shortcut: 'Ctrl+N' },
    { id: 'audit' as ActivityTab, label: 'Pull requests', icon: GitPullRequest },
    { id: 'tests' as ActivityTab, label: 'Scheduled', icon: Clock },
    { id: 'architecture' as ActivityTab, label: 'Plugins', icon: Layers },
  ];

  const recents = [
    'Auth flow validation',
    'Schema AST generation'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setIsHelpMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isHelpMenuOpen || isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHelpMenuOpen, isProfileMenuOpen]);

  const handleNewSession = () => {
    if (onNewSession) {
      onNewSession();
    } else {
      onTabChange('chat');
    }
  };

  return (
    <aside className="w-[240px] flex-shrink-0 h-full bg-[#141416] border-r border-white/[0.04] flex flex-col justify-between select-none z-20 print:hidden text-xs relative">
      
      {/* Top Section: App Name (VaultDoc) + Search & Notification Icons */}
      <div className="flex flex-col">
        <div className="h-10 flex items-center justify-between px-3">
          
          {/* App Brand Name */}
          <span className="text-[13px] font-semibold text-white tracking-tight select-none py-1">
            VaultDoc
          </span>

          {/* Quick Search & Notification Action Icons */}
          <div className="flex items-center gap-1">
            <button 
              type="button"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button 
              type="button"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <div className="px-2 space-y-0.5 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'chat') {
                    handleNewSession();
                  } else {
                    onTabChange(item.id);
                  }
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer group ${
                  isActive 
                    ? 'bg-white/10 text-white font-medium' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span className="text-[13px]">{item.label}</span>
                </div>
                {item.id === 'chat' && (
                  <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                )}
              </button>
            );
          })}
        </div>

        {/* Projects Section */}
        <div className="px-3 mt-6">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-2">
            <span>Projects</span>
            <button 
              type="button"
              onClick={onOpenFolder} 
              className="hover:text-white transition-colors cursor-pointer p-0.5" 
              title="Add / Create Project"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {projects.length > 0 ? (
              projects.map(proj => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => onSelectProject?.(proj.id)}
                  className={`w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left transition-colors cursor-pointer ${
                    activeProject === proj.id 
                      ? 'bg-white/5 text-white font-medium' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate text-xs font-mono">{proj.name}</span>
                </button>
              ))
            ) : (
              <p className="text-[11px] text-slate-600 px-2 py-1">No projects</p>
            )}
          </div>
        </div>

        {/* Recents Section */}
        <div className="px-3 mt-6">
          <div className="text-[11px] font-medium text-slate-400 mb-2">
            <span>Recents</span>
          </div>
          <div className="space-y-0.5">
            {recents.length > 0 ? (
              recents.map((recent, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectRecent?.(recent)}
                  className="w-full px-2 py-1.5 rounded-md text-left text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer truncate text-xs"
                >
                  {recent}
                </button>
              ))
            ) : (
              <p className="text-[11px] text-slate-600 px-2 py-1">No chats</p>
            )}
          </div>
        </div>

      </div>

      {/* User Profile Popover Menu (Matching Reference Screenshot 1) */}
      {isProfileMenuOpen && (
        <div
          ref={profileMenuRef}
          className="absolute bottom-12 left-2 w-[240px] bg-[#161619] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-fadeIn text-xs"
        >
          {/* Header Profile Identity */}
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1 border-b border-white/[0.06]">
            <div className="w-7 h-7 rounded-full bg-[#10a37f] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              AM
            </div>
            <div className="min-w-0">
              <p className="font-medium text-white text-xs truncate">Armaan Mujawar</p>
              <p className="text-[10px] text-slate-500 truncate">Local Air-Gapped Admin</p>
            </div>
          </div>

          {/* Menu Options */}
          <div className="space-y-0.5 mt-1 text-slate-300">
            
            {/* Local Engine Health / Status */}
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                onOpenSettings?.();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2">
                <Cpu size={14} className="text-sky-400" />
                <span>Local Engine Health</span>
              </div>
              <ChevronRight size={13} className="text-slate-500 group-hover:text-slate-300" />
            </button>

            {/* Zero-Egress Privacy Mode */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                <span>Air-Gapped Privacy</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono flex items-center gap-1 border border-emerald-500/20">
                <Check size={10} /> Active
              </span>
            </div>

            {/* LanceDB Vector Pipeline */}
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                onTabChange('architecture');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2">
                <Database size={14} className="text-purple-400" />
                <span>LanceDB Vector Index</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">512-dim</span>
            </button>

            <div className="border-t border-white/[0.06] my-1" />

            {/* Settings */}
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                onOpenSettings?.();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Settings size={14} className="text-slate-400" />
                <span>Settings</span>
              </div>
              <kbd className="text-[10px] font-mono text-slate-500 bg-white/5 px-1 rounded">Ctrl+,</kbd>
            </button>

            {/* Log out */}
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                handleNewSession();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer text-left"
            >
              <LogOut size={14} />
              <span>Log out</span>
            </button>

          </div>
        </div>
      )}

      {/* Help & What's New Popover Menu */}
      {isHelpMenuOpen && (
        <div 
          ref={helpMenuRef}
          className="absolute bottom-12 left-2 w-[285px] bg-[#161619] border border-white/10 rounded-xl p-3 shadow-2xl z-50 text-xs font-mono animate-fadeIn"
        >
          {/* Section 1: What's new */}
          <div className="mb-2">
            <h4 className="text-[11px] font-bold text-white mb-2">What's new</h4>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center justify-between group hover:text-white cursor-pointer py-0.5">
                <span className="truncate pr-2">├── Tree-sitter AST Multi-Language Parser</span>
                <span className="text-slate-500 text-[10px] flex-shrink-0">14 Aug</span>
              </div>
              <div className="flex items-center justify-between group hover:text-white cursor-pointer py-0.5">
                <span className="truncate pr-2">├── Pre-PR Shift-Left Security Scanners</span>
                <span className="text-slate-500 text-[10px] flex-shrink-0">11 Aug</span>
              </div>
              <div className="flex items-center justify-between group hover:text-white cursor-pointer py-0.5">
                <span className="truncate pr-2">└── Zero-Egress LanceDB Vector Pipeline</span>
                <span className="text-slate-500 text-[10px] flex-shrink-0">02 Aug</span>
              </div>
              <div className="flex items-center justify-between text-sky-400 hover:text-sky-300 cursor-pointer pt-1">
                <span>↗ Release Notes & Audit Logs</span>
                <ExternalLink size={11} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2.5" />

          {/* Section 2: Quick Links & Resource Actions */}
          <div className="space-y-1 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsHelpMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
            >
              <Puzzle size={13} className="text-purple-400 flex-shrink-0" />
              <span>VS Code / Cursor Extension</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsHelpMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
            >
              <Terminal size={13} className="text-sky-400 flex-shrink-0" />
              <span>VaultDoc Terminal CLI</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsHelpMenuOpen(false);
                onOpenSettings?.();
              }}
              className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
            >
              <Zap size={13} className="text-amber-400 flex-shrink-0" />
              <span>Ollama & Local Model Runtime Setup</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsHelpMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
            >
              <Keyboard size={13} className="text-slate-400 flex-shrink-0" />
              <span>Keyboard Shortcuts (Ctrl+/)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsHelpMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left cursor-pointer"
            >
              <ShieldCheck size={13} className="text-emerald-400 flex-shrink-0" />
              <span>Air-Gapped Telemetry Verification</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Profile Pill */}
      <div className="p-2 border-t border-white/[0.04]">
        <div className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-white/5 transition-colors group">
          {/* Clicking User Profile opens User Profile Popover */}
          <button 
            type="button"
            onClick={() => setIsProfileMenuOpen(prev => !prev)}
            className={`flex items-center gap-2 min-w-0 cursor-pointer flex-1 text-left p-1 rounded-lg transition-colors ${
              isProfileMenuOpen ? 'bg-white/10' : ''
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#10a37f] text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
              AM
            </div>
            <span className="text-xs font-medium text-slate-200 truncate group-hover:text-white font-sans">
              Armaan Mujawar
            </span>
          </button>

          {/* Help Button (Opens the What's New Popover) */}
          <button
            type="button"
            onClick={() => setIsHelpMenuOpen(prev => !prev)}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isHelpMenuOpen ? 'text-white bg-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
            title="Help & What's new"
          >
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>
      </div>

    </aside>
  );
};

export default ActivityDock;
