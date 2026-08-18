import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  MessageSquarePlus, 
  GitPullRequest, 
  Layers, 
  Folder, 
  FolderOpen,
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
  Check,
  FileCode,
  FlaskConical,
  Pin,
  Edit2,
  Archive,
  Trash2,
  Copy,
  GitBranch,
  Share2,
  FolderMinus,
  CircleDot
} from 'lucide-react';

import { 
  type ChatSession, 
  getStoredChatSessions, 
  getStoredActiveSessionId, 
  saveStoredActiveSessionId,
  renameChatSession,
  togglePinChatSession,
  archiveChatSession,
  moveChatSessionToProject,
  deleteChatSession,
  forkChatSession
} from '../services/chatSessions';

export type ActivityTab = 'chat' | 'docs' | 'architecture' | 'spec' | 'audit' | 'tests' | 'git';

interface ActivityDockProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  activeProject?: string;
  projects?: { id: string; name: string; path?: string }[];
  activeSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  onSelectProject?: (project: string) => void;
  onOpenFolder?: () => void;
  onOpenSettings?: (category?: string) => void;
  onSelectRecent?: (recentPrompt: string) => void;
  onNewSession?: () => void;
}

export const ActivityDock = ({
  activeTab,
  onTabChange,
  activeProject = '',
  projects = [],
  activeSessionId: propActiveSessionId,
  onSelectSession,
  onSelectProject,
  onOpenFolder,
  onOpenSettings,
  onSelectRecent,
  onNewSession
}: ActivityDockProps) => {
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => getStoredChatSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return propActiveSessionId !== undefined ? propActiveSessionId : getStoredActiveSessionId();
  });
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => {
    return new Set(activeProject ? [activeProject] : []);
  });
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    session: ChatSession;
    project?: { id: string; name: string };
  } | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const helpMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const navItems: { id: ActivityTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'chat', label: 'New chat', icon: MessageSquarePlus },
    { id: 'audit', label: 'Pre-PR Audits', icon: ShieldCheck },
    { id: 'architecture', label: 'Architecture Canvas', icon: Layers },
    { id: 'spec', label: 'Ticket Specs', icon: FileCode },
    { id: 'tests', label: 'Test Suites', icon: FlaskConical },
    { id: 'git', label: 'Git Sync', icon: GitPullRequest },
  ];

  useEffect(() => {
    if (propActiveSessionId !== undefined) {
      setActiveSessionId(propActiveSessionId);
    }
  }, [propActiveSessionId]);

  useEffect(() => {
    const handleSessionsSync = () => {
      setSessions(getStoredChatSessions());
      setActiveSessionId(getStoredActiveSessionId());
    };
    window.addEventListener('vaultdoc_sessions_change', handleSessionsSync);
    return () => window.removeEventListener('vaultdoc_sessions_change', handleSessionsSync);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setIsHelpMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHelpMenuOpen(false);
        setIsProfileMenuOpen(false);
        setContextMenu(null);
        setEditingSessionId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleNewSession = () => {
    saveStoredActiveSessionId(null);
    setActiveSessionId(null);
    if (onNewSession) {
      onNewSession();
    } else {
      onTabChange('chat');
    }
  };

  const handleSelectSession = (sessionId: string) => {
    saveStoredActiveSessionId(sessionId);
    setActiveSessionId(sessionId);
    if (onSelectSession) {
      onSelectSession(sessionId);
    } else if (onSelectRecent) {
      onSelectRecent(sessionId);
    }
    onTabChange('chat');
  };

  const handleCommitRename = (sessionId: string) => {
    if (editingTitle.trim()) {
      renameChatSession(sessionId, editingTitle.trim());
      showToast("Chat renamed");
    }
    setEditingSessionId(null);
  };

  const handleTogglePin = (session: ChatSession) => {
    const isPinned = togglePinChatSession(session.id);
    setContextMenu(null);
    showToast(isPinned ? "Chat pinned" : "Chat unpinned");
  };

  const handleRemoveFromProject = (session: ChatSession, projName?: string) => {
    moveChatSessionToProject(session.id, 'general');
    setContextMenu(null);
    showToast(projName ? `Removed from ${projName}` : "Removed from project");
  };

  const handleStartRename = (session: ChatSession) => {
    setContextMenu(null);
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 50);
  };

  const handleArchive = (session: ChatSession) => {
    archiveChatSession(session.id);
    setContextMenu(null);
    showToast("Chat archived");
  };

  const handleMarkAsUnread = () => {
    setContextMenu(null);
    showToast("Marked as unread");
  };

  const handleOpenInExplorer = (session: ChatSession, project?: { id: string; name: string }) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(project ? project.name : session.title);
    }
    setContextMenu(null);
    showToast("Opened in Explorer");
  };

  const handleCopyWorkingDir = (project?: { id: string; name: string }) => {
    const text = project ? project.name : 'Workspace Root';
    navigator.clipboard.writeText(text);
    setContextMenu(null);
    showToast("Copied working directory");
  };

  const handleCopySessionId = (session: ChatSession) => {
    navigator.clipboard.writeText(session.id);
    setContextMenu(null);
    showToast("Copied session ID");
  };

  const handleCopyDeeplink = (session: ChatSession) => {
    navigator.clipboard.writeText(`vaultdoc://chat/${session.id}`);
    setContextMenu(null);
    showToast("Copied deeplink");
  };

  const handleForkChat = (session: ChatSession) => {
    const forked = forkChatSession(session.id);
    setContextMenu(null);
    if (forked) {
      handleSelectSession(forked.id);
      showToast("Chat forked");
    }
  };

  const handleForkChatWorktree = (session: ChatSession) => {
    const forked = forkChatSession(session.id);
    setContextMenu(null);
    if (forked) {
      handleSelectSession(forked.id);
      showToast("Forked in new worktree");
    }
  };

  const handleDelete = (session: ChatSession) => {
    deleteChatSession(session.id);
    setContextMenu(null);
    showToast("Chat deleted");
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
          <div className="space-y-1">
            {projects.length > 0 ? (
              projects.map(proj => {
                const projectSessions = sessions.filter(s => s.projectId === proj.id && !s.isArchived);
                const isProjectSelected = activeProject === proj.id;
                const isExpanded = expandedProjects.has(proj.id);

                return (
                  <div key={proj.id} className="space-y-0.5">
                    {/* Project Folder Row */}
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedProjects(prev => {
                          const next = new Set(prev);
                          if (next.has(proj.id)) {
                            next.delete(proj.id);
                          } else {
                            next.add(proj.id);
                          }
                          return next;
                        });
                        onSelectProject?.(proj.id);
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left transition-all cursor-pointer group select-none ${
                        isProjectSelected 
                          ? 'text-white bg-white/[0.08] font-medium shadow-sm' 
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {isExpanded ? (
                        <FolderOpen className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isProjectSelected ? 'text-sky-400' : 'text-slate-400 group-hover:text-sky-400'}`} />
                      ) : (
                        <Folder className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isProjectSelected ? 'text-sky-400' : 'text-slate-400 group-hover:text-sky-400'}`} />
                      )}
                      <span className="truncate text-xs font-mono flex-1 group-hover:text-slate-200">{proj.name}</span>
                      
                      {/* Task / Chat Count Badge */}
                      {projectSessions.length > 0 && (
                        <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.2 rounded bg-black/30 border border-white/5">
                          {projectSessions.length}
                        </span>
                      )}
                    </button>

                    {/* Nested Chats Assigned to this Project (Collapsible / Shrinkable) */}
                    {isExpanded && projectSessions.length > 0 && (
                      <div className="space-y-0.5 pl-2 border-l border-white/[0.06] ml-3.5 my-1 animate-fadeIn">
                        {projectSessions.map(session => {
                          const isActive = activeTab === 'chat' && activeSessionId === session.id;

                          if (editingSessionId === session.id) {
                            return (
                              <form
                                key={session.id}
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleCommitRename(session.id);
                                }}
                                className="w-full pl-4 pr-2 py-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  ref={renameInputRef}
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onBlur={() => handleCommitRename(session.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') setEditingSessionId(null);
                                  }}
                                  className="w-full bg-[#1c1c22] border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white outline-none font-sans"
                                  autoFocus
                                />
                              </form>
                            );
                          }

                          return (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => {
                                onSelectProject?.(proj.id);
                                handleSelectSession(session.id);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const menuWidth = 240;
                                const menuHeight = 420;
                                const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
                                const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
                                setContextMenu({
                                  x,
                                  y,
                                  session,
                                  project: proj
                                });
                              }}
                              className={`w-full pl-4 pr-2 py-1 rounded-md text-left transition-all cursor-pointer text-xs flex items-center justify-between group ${
                                isActive 
                                  ? 'bg-white/10 text-white font-medium shadow-sm' 
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`}
                              title={`${session.title} (${proj.name}) - Right-click for options`}
                            >
                              <span className="truncate flex-1">{session.title}</span>
                              {session.isPinned && (
                                <Pin size={10} className="text-sky-400 flex-shrink-0 ml-1.5 opacity-80" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-[11px] text-slate-600 px-2 py-1">No projects</p>
            )}
          </div>
        </div>

        {/* Recents Section (General / Unassigned Chats) */}
        <div className="px-3 mt-6">
          <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center justify-between">
            <span>Recents</span>
            {sessions.filter(s => (!s.projectId || s.projectId === 'general' || s.projectId === '') && s.isPinned && !s.isArchived).length > 0 && (
              <span className="text-[9px] text-sky-400 font-mono flex items-center gap-0.5">
                <Pin size={9} /> {sessions.filter(s => (!s.projectId || s.projectId === 'general' || s.projectId === '') && s.isPinned && !s.isArchived).length} pinned
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            {sessions.filter(s => (!s.projectId || s.projectId === 'general' || s.projectId === '') && !s.isArchived).length > 0 ? (
              [...sessions.filter(s => (!s.projectId || s.projectId === 'general' || s.projectId === '') && !s.isArchived)].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((session) => {
                const isActive = activeTab === 'chat' && activeSessionId === session.id;

                if (editingSessionId === session.id) {
                  return (
                    <form
                      key={session.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCommitRename(session.id);
                      }}
                      className="w-full px-2 py-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleCommitRename(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        className="w-full bg-[#1c1c22] border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white outline-none font-sans"
                        autoFocus
                      />
                    </form>
                  );
                }

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleSelectSession(session.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const menuWidth = 240;
                      const menuHeight = 420;
                      const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
                      const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
                      setContextMenu({
                        x,
                        y,
                        session
                      });
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs flex items-center justify-between group ${
                      isActive 
                        ? 'bg-white/10 text-white font-medium shadow-sm' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={`${session.title} - Right-click for options`}
                  >
                    <span className="truncate flex-1">{session.title}</span>
                    {session.isPinned && (
                      <Pin size={11} className="text-sky-400 flex-shrink-0 ml-1.5 opacity-80 group-hover:opacity-100" />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="text-[11px] text-slate-600 px-2 py-1">No unassigned chats</p>
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
                onOpenSettings?.('general');
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

            {/* Archived Chats in Profile Popover */}
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                onOpenSettings?.('archived');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2">
                <Archive size={14} className="text-amber-400" />
                <span>Archived Chats</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 bg-white/5 rounded-full">
                {sessions.filter(s => s.isArchived).length}
              </span>
            </button>

            <div className="border-t border-white/[0.06] my-1" />

            {/* Settings */}
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                onOpenSettings?.('general');
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

      {/* Custom Context Menu (Matching Codex Right-Click Style) */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`
          }}
          className="fixed w-56 bg-[#18181c] border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[100] animate-fadeIn text-xs text-slate-300 font-sans select-none backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pin chat */}
          <button
            type="button"
            onClick={() => handleTogglePin(contextMenu.session)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <Pin size={13} className={contextMenu.session.isPinned ? "text-sky-400" : "text-slate-400 group-hover:text-white"} />
            <span>{contextMenu.session.isPinned ? "Unpin chat" : "Pin chat"}</span>
          </button>

          {/* Remove from Project (if assigned to project) */}
          {contextMenu.project && (
            <button
              type="button"
              onClick={() => handleRemoveFromProject(contextMenu.session, contextMenu.project?.name)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
            >
              <FolderMinus size={13} className="text-slate-400 group-hover:text-white" />
              <span className="truncate">Remove from {contextMenu.project.name}</span>
            </button>
          )}

          {/* Rename chat */}
          <button
            type="button"
            onClick={() => handleStartRename(contextMenu.session)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <Edit2 size={13} className="text-slate-400 group-hover:text-white" />
            <span>Rename chat</span>
          </button>

          {/* Archive chat */}
          <button
            type="button"
            onClick={() => handleArchive(contextMenu.session)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <Archive size={13} className="text-slate-400 group-hover:text-white" />
            <span>Archive chat</span>
          </button>

          {/* Mark as unread */}
          <button
            type="button"
            onClick={handleMarkAsUnread}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <CircleDot size={13} className="text-slate-400 group-hover:text-white" />
            <span>Mark as unread</span>
          </button>

          <div className="border-t border-white/[0.08] my-1" />

          {/* Open in Explorer */}
          <button
            type="button"
            onClick={() => handleOpenInExplorer(contextMenu.session, contextMenu.project)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <ExternalLink size={13} className="text-slate-400 group-hover:text-white" />
            <span>Open in Explorer</span>
          </button>

          {/* Copy working directory */}
          <button
            type="button"
            onClick={() => handleCopyWorkingDir(contextMenu.project)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <Folder size={13} className="text-slate-400 group-hover:text-white" />
            <span>Copy working directory</span>
          </button>

          {/* Copy session ID */}
          <button
            type="button"
            onClick={() => handleCopySessionId(contextMenu.session)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <Copy size={13} className="text-slate-400 group-hover:text-white" />
            <span>Copy session ID</span>
          </button>

          {/* Copy deeplink */}
          <button
            type="button"
            onClick={() => handleCopyDeeplink(contextMenu.session)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <Share2 size={13} className="text-slate-400 group-hover:text-white" />
            <span>Copy deeplink</span>
          </button>

          <div className="border-t border-white/[0.08] my-1" />

          {/* Fork chat */}
          <button
            type="button"
            onClick={() => handleForkChat(contextMenu.session)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <GitBranch size={13} className="text-slate-400 group-hover:text-white" />
            <span>Fork chat</span>
          </button>

          {/* Fork chat in new worktree */}
          <button
            type="button"
            onClick={() => handleForkChatWorktree(contextMenu.session)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-left group"
          >
            <Layers size={13} className="text-slate-400 group-hover:text-white" />
            <span>Fork chat in new worktree</span>
          </button>

          <div className="border-t border-white/[0.08] my-1" />

          {/* Delete chat */}
          <button
            type="button"
            onClick={() => handleDelete(contextMenu.session)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left group"
          >
            <Trash2 size={13} className="text-red-400/80 group-hover:text-red-400" />
            <span>Delete chat</span>
          </button>
        </div>
      )}

      {/* Floating Action Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 z-[110] px-3 py-1.5 bg-[#1e1e24]/95 backdrop-blur-md border border-white/15 text-white text-xs font-sans rounded-xl shadow-2xl flex items-center gap-2 animate-fadeIn">
          <Check size={13} className="text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </aside>
  );
};

export default ActivityDock;
