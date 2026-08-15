import React, { useState } from 'react';
import { 
  PanelLeft, 
  ChevronLeft, 
  ChevronRight, 
  Minus, 
  Square, 
  X, 
  Search, 
  Bell 
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface TitlebarProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  isSidebarOpen = true,
  onToggleSidebar
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

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

      {/* Right: Window Controls */}
      <div 
        className="flex items-center space-x-0 text-slate-400 z-20 relative pointer-events-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
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
