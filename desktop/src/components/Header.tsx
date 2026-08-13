import React from 'react';
import { Shield, ChevronDown, Settings, Table, Link, Minus } from 'lucide-react';

interface HeaderProps {
  repoName?: string;
  onSelectRepo?: () => void;
  onOpenSettings?: () => void;
  onInsertMarkdown?: (action: string) => void;
}

const Header = ({ repoName, onSelectRepo, onOpenSettings, onInsertMarkdown }: HeaderProps) => {
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
        <div className="flex items-center gap-3 text-xs text-vault-textBody select-none">
          <button onClick={() => onInsertMarkdown?.('h1')} className="hover:text-vault-textPrimary font-bold transition-colors">H1</button>
          <button onClick={() => onInsertMarkdown?.('h2')} className="hover:text-vault-textPrimary font-bold transition-colors">H2</button>
          <button onClick={() => onInsertMarkdown?.('h3')} className="hover:text-vault-textPrimary font-bold transition-colors">H3</button>
          <button onClick={() => onInsertMarkdown?.('bold')} className="font-serif italic hover:text-vault-textPrimary font-bold transition-colors">B</button>
          <button onClick={() => onInsertMarkdown?.('italic')} className="italic hover:text-vault-textPrimary transition-colors">I</button>
          <button onClick={() => onInsertMarkdown?.('strikethrough')} className="line-through hover:text-vault-textPrimary transition-colors">~~</button>
          <button onClick={() => onInsertMarkdown?.('code')} className="hover:text-vault-textPrimary opacity-75 px-1 bg-vault-card rounded font-mono transition-colors">` `</button>
          
          <span className="w-[1px] h-3 bg-vault-border mx-1"></span>
          
          <button onClick={() => onInsertMarkdown?.('table')} className="flex items-center gap-1 hover:text-vault-textPrimary transition-colors"><Table className="w-3 h-3"/> Table</button>
          <button onClick={() => onInsertMarkdown?.('link')} className="flex items-center gap-1 hover:text-vault-textPrimary transition-colors"><Link className="w-3 h-3"/> Link</button>
          <button onClick={() => onInsertMarkdown?.('hr')} className="flex items-center gap-1 hover:text-vault-textPrimary transition-colors"><Minus className="w-3 h-3"/> HR</button>
        </div>

        <div className="flex items-center gap-2 bg-vault-security/15 border border-vault-security/30 px-3 py-1 rounded-full text-xs text-vault-security shadow-[0_0_10px_rgba(16,185,129,0.15)]">
          <Shield className="w-3 h-3" />
          <span className="font-medium tracking-wide">Air-Gapped Mode</span>
          <span className="opacity-70 ml-1">100% Local</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-vault-panel px-3 py-1 rounded text-xs text-vault-textBody border border-vault-border opacity-70">
          <span>parser.ts</span>
          <span className="text-[10px]">•</span>
          <span className="text-vault-accent">ln 67</span>
        </div>
        
        <Settings 
          onClick={onOpenSettings}
          className="w-4 h-4 text-vault-textBody hover:text-vault-textPrimary cursor-pointer" 
        />
        
      </div>
    </div>
  );
};

export default Header;
