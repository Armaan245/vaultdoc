import React from 'react';
import { Shield, ChevronDown, Settings, Table, Link, Minus } from 'lucide-react';

interface HeaderProps {
  repoName?: string;
  onSelectRepo?: () => void;
  onOpenSettings?: () => void;
  onInsertMarkdown?: (action: string) => void;
  activeFormats?: Record<string, boolean>;
  activeFile?: string;
  currentLine?: number;
  activeMode?: 1 | 2;
}

const ToolbarBtn = ({ 
  active, 
  onClick, 
  children,
  className = ''
}: { 
  active?: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`px-2 py-1 rounded text-xs transition-all duration-150 flex items-center justify-center gap-1 font-medium ${
      active
        ? 'bg-vault-accent/20 text-vault-accent border border-vault-accent/40 font-bold shadow-sm'
        : 'hover:bg-vault-card hover:text-vault-textPrimary text-vault-textBody border border-transparent'
    } ${className}`}
  >
    {children}
  </button>
);

const Header = ({ repoName, onSelectRepo, onOpenSettings, onInsertMarkdown, activeFormats, activeFile, currentLine, activeMode = 1 }: HeaderProps) => {
  return (
    <div className="h-12 w-full bg-vault-base flex items-center justify-between px-4 border-b border-vault-border print:hidden">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-vault-accent" />
          <span className="font-bold text-vault-textPrimary">VaultDoc</span>
        </div>
        
        <button 
          onClick={onSelectRepo}
          className="flex items-center gap-2 bg-vault-panel hover:bg-vault-card transition-colors px-3 py-1 rounded-full text-xs text-vault-textBody border border-vault-border">
          <span className="mr-1">📁</span> {repoName || 'Select Repository'}
          <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
        </button>
      </div>

      {/* Center Formatting Toolbar & Security Pill */}
      <div className="flex items-center justify-center gap-6 absolute left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-1 text-xs text-vault-textBody select-none">
          <ToolbarBtn active={activeFormats?.h1} onClick={() => onInsertMarkdown?.('h1')} className="font-bold">H1</ToolbarBtn>
          <ToolbarBtn active={activeFormats?.h2} onClick={() => onInsertMarkdown?.('h2')} className="font-bold">H2</ToolbarBtn>
          <ToolbarBtn active={activeFormats?.h3} onClick={() => onInsertMarkdown?.('h3')} className="font-bold">H3</ToolbarBtn>
          <ToolbarBtn active={activeFormats?.bold} onClick={() => onInsertMarkdown?.('bold')} className="font-serif italic font-bold">B</ToolbarBtn>
          <ToolbarBtn active={activeFormats?.italic} onClick={() => onInsertMarkdown?.('italic')} className="italic">I</ToolbarBtn>
          <ToolbarBtn active={activeFormats?.strikethrough} onClick={() => onInsertMarkdown?.('strikethrough')} className="line-through">~~</ToolbarBtn>
          <ToolbarBtn active={activeFormats?.code} onClick={() => onInsertMarkdown?.('code')} className="font-mono">` `</ToolbarBtn>
          
          <span className="w-[1px] h-3 bg-vault-border mx-1"></span>
          
          <ToolbarBtn active={activeFormats?.table} onClick={() => onInsertMarkdown?.('table')}><Table className="w-3 h-3"/> Table</ToolbarBtn>
          <ToolbarBtn active={activeFormats?.link} onClick={() => onInsertMarkdown?.('link')}><Link className="w-3 h-3"/> Link</ToolbarBtn>
          <ToolbarBtn active={activeFormats?.hr} onClick={() => onInsertMarkdown?.('hr')}><Minus className="w-3 h-3"/> HR</ToolbarBtn>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-colors shadow-sm ${
          activeMode === 1
            ? 'bg-vault-security/15 border border-vault-security/30 text-vault-security shadow-[0_0_10px_rgba(16,185,129,0.15)]'
            : 'bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
        }`}>
          {activeMode === 1 ? (
            <>
              <Shield className="w-3 h-3" />
              <span className="font-medium tracking-wide">Air-Gapped Mode</span>
              <span className="opacity-70 ml-1">100% Local</span>
            </>
          ) : (
            <>
              <span className="text-[10px]">☁️</span>
              <span className="font-medium tracking-wide">Enterprise Cloud</span>
              <span className="opacity-70 ml-1">Outbound Enabled</span>
            </>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {!repoName ? (
          <div className="flex items-center gap-2 bg-vault-panel px-3 py-1 rounded text-xs text-vault-textBody border border-vault-border opacity-40">
            <span>No Repo Loaded</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-vault-panel px-3 py-1 rounded text-xs text-vault-textBody border border-vault-border opacity-70">
            <span>{activeFile || 'workspace'}</span>
            <span className="text-[10px]">•</span>
            <span className="text-vault-accent">{currentLine ? `ln ${currentLine}` : 'ready'}</span>
          </div>
        )}
        
        <Settings 
          onClick={onOpenSettings}
          className="w-4 h-4 text-vault-textBody hover:text-vault-textPrimary cursor-pointer" 
        />
        
      </div>
    </div>
  );
};

export default Header;
