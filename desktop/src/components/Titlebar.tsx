import React, { useState, useEffect } from 'react';
import { 
  PanelLeft, 
  ChevronLeft, 
  ChevronRight, 
  Minus, 
  Square, 
  X, 
  Search, 
  Bell,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { 
  subscribeSidecar, 
  startSidecar, 
  type OllamaSidecarStatus 
} from '../services/sidecar';

interface TitlebarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onOpenSettings?: (category?: string) => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  isSidebarOpen = true,
  onToggleSidebar,
  onOpenSettings
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [sidecarStatus, setSidecarStatus] = useState<OllamaSidecarStatus>({
    isRunning: false,
    isBundled: false,
    status: 'starting',
    port: 11434,
    endpoint: 'http://localhost:11434',
    models: [],
    message: 'Initializing...',
    lastChecked: new Date(),
  });
  const [isRestarting, setIsRestarting] = useState(false);
  const [showSidecarMenu, setShowSidecarMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSidecar((status) => {
      setSidecarStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const handleStartRestart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRestarting(true);
    try {
      await startSidecar();
    } finally {
      setIsRestarting(false);
    }
  };

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_minimize');
    } catch {
      try {
        const win = getCurrentWindow();
        await win.minimize();
      } catch (err) {
        console.warn('Minimize fallback error:', err);
      }
    }
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_maximize');
      setIsMaximized(prev => !prev);
    } catch {
      try {
        const win = getCurrentWindow();
        await win.toggleMaximize();
        setIsMaximized(prev => !prev);
      } catch (err) {
        console.warn('Maximize fallback error:', err);
      }
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_close');
    } catch {
      try {
        const win = getCurrentWindow();
        await win.close();
      } catch (err) {
        console.warn('Close fallback error:', err);
      }
    }
  };

  const handleStartDragging = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      try {
        const win = getCurrentWindow();
        await win.startDragging();
      } catch (_) {}
    }
  };

  return (
    <div 
      className="h-9 w-full bg-[#141416] border-b border-white/[0.04] flex items-center justify-between px-2 select-none relative z-50 flex-shrink-0 print:hidden"
    >
      {/* Left: Navigation, Sidebar Toggle & Menus */}
      <div 
        className="flex items-center space-x-2 z-20 relative pointer-events-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Toggle Sidebar Icon with Tooltip */}
        <div className="relative group flex items-center">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer ${
              !isSidebarOpen ? 'text-sky-400' : ''
            }`}
            title="Toggle sidebar (Ctrl+B)"
          >
            <PanelLeft size={15} />
          </button>
          <div className="absolute top-full left-0 mt-1 hidden group-hover:flex items-center gap-1.5 px-2 py-1 bg-[#1e1e24] text-[11px] text-slate-300 rounded-md border border-white/10 shadow-xl whitespace-nowrap pointer-events-none z-50">
            <span>Toggle sidebar</span>
            <kbd className="bg-white/10 px-1 py-0.5 rounded text-[9px] font-mono text-slate-400">Ctrl+B</kbd>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center space-x-0.5 text-slate-500">
          <button 
            type="button"
            className="p-1 hover:text-white transition-colors cursor-pointer" 
            title="Back"
          >
            <ChevronLeft size={14} />
          </button>
          <button 
            type="button"
            className="p-1 hover:text-white transition-colors cursor-pointer opacity-50 hover:opacity-100" 
            title="Forward"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex items-center space-x-1 text-xs font-normal text-slate-400 pl-1">
          <button type="button" className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer">File</button>
          <button type="button" className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer">Edit</button>
          <button type="button" className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer">View</button>
          <button type="button" className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer">Help</button>
        </div>

        {/* When sidebar is collapsed, show quick Search & Bell in the titlebar */}
        {!isSidebarOpen && (
          <div className="flex items-center space-x-1 pl-2 border-l border-white/10">
            <button type="button" className="p-1 text-slate-400 hover:text-white transition-colors" title="Search">
              <Search size={13} />
            </button>
            <button type="button" className="p-1 text-slate-400 hover:text-white transition-colors" title="Notifications">
              <Bell size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Drag Surface (Spanning the background) */}
      <div 
        data-tauri-drag-region
        onMouseDown={handleStartDragging}
        onDoubleClick={handleMaximize}
        className="absolute inset-0 flex items-center justify-center cursor-default z-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Right: Sidecar Status & Window Controls */}
      <div 
        className="flex items-center space-x-1 text-slate-400 z-20 relative pointer-events-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Ollama Sidecar Health Badge */}
        <div className="relative flex items-center pr-1">
          <button
            type="button"
            onClick={() => setShowSidecarMenu(prev => !prev)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
              sidecarStatus.status === 'bundled'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : sidecarStatus.status === 'external'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                : sidecarStatus.status === 'starting'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
            title="Ollama Local Inference Engine Status"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              sidecarStatus.status === 'bundled' || sidecarStatus.status === 'external'
                ? 'bg-emerald-400 animate-pulse'
                : sidecarStatus.status === 'starting'
                ? 'bg-amber-400 animate-spin'
                : 'bg-rose-400'
            }`} />
            <Cpu size={12} className="opacity-80" />
            <span className="font-mono text-[10px]">
              {sidecarStatus.status === 'bundled'
                ? 'Sidecar :11434'
                : sidecarStatus.status === 'external'
                ? 'Ollama :11434'
                : sidecarStatus.status === 'starting'
                ? 'Starting...'
                : 'Ollama Offline'}
            </span>
            {sidecarStatus.models.length > 0 && (
              <span className="px-1 py-0.2 rounded text-[9px] bg-white/10 font-bold">
                {sidecarStatus.models.length}m
              </span>
            )}
          </button>

          {/* Sidecar Dropdown / Diagnostics Popover */}
          {showSidecarMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#181920] border border-white/10 rounded-xl shadow-2xl p-3 z-50 text-xs text-slate-200 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                  <Cpu size={14} className="text-cyan-400" />
                  <span>Local Inference Engine</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  sidecarStatus.isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {sidecarStatus.isRunning ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-400 mb-3">
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className="text-slate-200 font-mono">
                    {sidecarStatus.isBundled ? 'Managed Sidecar' : (sidecarStatus.isRunning ? 'System Service' : 'None')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Endpoint:</span>
                  <span className="text-slate-200 font-mono">http://localhost:11434</span>
                </div>
                <div className="flex justify-between">
                  <span>Models:</span>
                  <span className="text-slate-200 font-medium">{sidecarStatus.models.length} detected</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-1 leading-relaxed">{sidecarStatus.message}</p>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                <button
                  type="button"
                  disabled={isRestarting}
                  onClick={handleStartRestart}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-300 hover:bg-sky-600/30 transition-all font-medium text-[11px] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isRestarting ? 'animate-spin' : ''} />
                  <span>{sidecarStatus.isRunning ? 'Restart Sidecar' : 'Start Sidecar'}</span>
                </button>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSidecarMenu(false);
                      onOpenSettings('ai');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all text-[11px] cursor-pointer"
                  >
                    Configure
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleMinimize}
          className="h-9 w-10 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="h-9 w-10 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <Square size={11} />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="h-9 w-10 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export default Titlebar;
