import React from 'react';
import { Shield, ChevronDown, Settings, Table, Link, Minus } from 'lucide-react';

const Header = ({ repoName }: { repoName?: string }) => {
  return (
    <div className="h-12 w-full bg-vault-base flex items-center justify-between px-4 border-b border-vault-border">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-vault-accent" />
          <span className="font-bold text-vault-textPrimary">VaultDoc</span>
        </div>
        
        <button className="flex items-center gap-2 bg-vault-panel hover:bg-vault-card transition-colors px-3 py-1 rounded-full text-xs text-vault-textBody border border-vault-border">
          <span className="mr-1">📁</span> {repoName || 'Select Repository'}
          <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
        </button>
      </div>

      {/* Center Formatting Toolbar & Security Pill */}
      <div className="flex items-center justify-center gap-6 absolute left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-3 text-xs text-vault-textBody">
          <span className="hover:text-vault-textPrimary cursor-pointer font-bold">H1</span>
          <span className="hover:text-vault-textPrimary cursor-pointer font-bold">H2</span>
          <span className="hover:text-vault-textPrimary cursor-pointer font-bold">H3</span>
          <span className="font-serif italic hover:text-vault-textPrimary cursor-pointer font-bold">B</span>
          <span className="italic hover:text-vault-textPrimary cursor-pointer">I</span>
          <span className="line-through hover:text-vault-textPrimary cursor-pointer">~~</span>
          <span className="hover:text-vault-textPrimary cursor-pointer opacity-75 px-1 bg-vault-card rounded">` `</span>
          
          <span className="w-[1px] h-3 bg-vault-border mx-1"></span>
          
          <button className="flex items-center gap-1 hover:text-vault-textPrimary"><Table className="w-3 h-3"/> Table</button>
          <button className="flex items-center gap-1 hover:text-vault-textPrimary"><Link className="w-3 h-3"/> Link</button>
          <button className="flex items-center gap-1 hover:text-vault-textPrimary"><Minus className="w-3 h-3"/> HR</button>
        </div>

        <div className="flex items-center gap-2 bg-vault-securityDark bg-opacity-20 border border-vault-security border-opacity-30 px-3 py-1 rounded-full text-xs text-vault-security shadow-[0_0_10px_rgba(16,185,129,0.15)]">
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
        
        <Settings className="w-4 h-4 text-vault-textBody hover:text-vault-textPrimary cursor-pointer" />
        
        {/* Window Controls Dummy */}
        <div className="flex gap-1.5 ml-2">
          <div className="w-3 h-3 rounded-full bg-vault-yellow"></div>
          <div className="w-3 h-3 rounded-full bg-vault-security"></div>
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
        </div>
      </div>
    </div>
  );
};

export default Header;
