import React from 'react';
import { 
  Shield, 
  ChevronDown, 
  Settings, 
  Table, 
  Link, 
  Minus, 
  Edit3, 
  Eye, 
  Download, 
  Copy, 
  FileText, 
  Check, 
  Play, 
  RefreshCw, 
  Send,
  Sparkles,
  GitPullRequest,
  PanelRight,
  Layers
} from 'lucide-react';
import type { ActivityTab } from './ActivityDock';
import type { ArchitectureViewMode } from '../services/architecture';

interface HeaderProps {
  activeTab: ActivityTab;
  repoName?: string;
  onSelectRepo?: () => void;
  onOpenSettings?: () => void;
  activeMode?: 1 | 2;
  activeFile?: string;
  currentLine?: number;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  
  // Docs Tab Actions
  onInsertMarkdown?: (action: string) => void;
  activeFormats?: Record<string, boolean>;
  docViewMode?: 'preview' | 'edit';
  onToggleDocViewMode?: () => void;
  onExportDocMd?: () => void;
  onExportDocPdf?: () => void;
  onCopyDoc?: () => void;
  docCopied?: boolean;

  // Architecture Tab Actions
  archViewMode?: ArchitectureViewMode;
  onArchViewModeChange?: (mode: ArchitectureViewMode) => void;
  onExportArchSvg?: () => void;
  onCopyArchMermaid?: () => void;
  onExportArchPdf?: () => void;
  archCopied?: boolean;

  // Pre-PR Review Tab Actions
  severityFilter?: string;
  onSeverityFilterChange?: (filter: string) => void;
  onRunAudit?: () => void;
  onRefreshDiff?: () => void;
  isAuditing?: boolean;

  // Ticket Spec Tab Actions
  onAnalyzeTicket?: () => void;
  onCopyTicketSpec?: () => void;
  isAnalyzingTicket?: boolean;
  ticketSpecCopied?: boolean;

  // Test Suite Tab Actions
  testFramework?: string;
  onTestFrameworkChange?: (fw: string) => void;
  onCopyTests?: () => void;
  testsCopied?: boolean;

  // Git / PR Tab Actions
  onCreatePR?: () => void;
  isSubmittingPR?: boolean;
}

const ToolbarBtn = ({ 
  active, 
  onClick, 
  children,
  className = '',
  title = ''
}: { 
  active?: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  className?: string;
  title?: string;
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`px-2 py-1 rounded text-xs transition-all duration-150 flex items-center justify-center gap-1 font-medium ${
      active
        ? 'bg-vault-accent/20 text-vault-accent border border-vault-accent/40 font-bold shadow-sm'
        : 'hover:bg-vault-card hover:text-vault-textPrimary text-vault-textBody border border-transparent'
    } ${className}`}
  >
    {children}
  </button>
);

export const Header = ({ 
  activeTab = 'docs',
  repoName, 
  onSelectRepo, 
  onOpenSettings, 
  activeMode = 1,
  activeFile: _activeFile,
  currentLine: _currentLine,
  isInspectorOpen = false,
  onToggleInspector,
  
  // Docs
  onInsertMarkdown,
  activeFormats,
  docViewMode = 'preview',
  onToggleDocViewMode,
  onExportDocMd,
  onExportDocPdf,
  onCopyDoc,
  docCopied = false,

  // Architecture
  archViewMode: _archViewMode = 'system',
  onArchViewModeChange: _onArchViewModeChange,
  onExportArchSvg: _onExportArchSvg,
  onCopyArchMermaid: _onCopyArchMermaid,
  onExportArchPdf: _onExportArchPdf,
  archCopied: _archCopied = false,

  // Pre-PR
  severityFilter = 'all',
  onSeverityFilterChange,
  onRunAudit,
  onRefreshDiff,
  isAuditing = false,

  // Ticket Spec
  onAnalyzeTicket,
  onCopyTicketSpec,
  isAnalyzingTicket = false,
  ticketSpecCopied = false,

  // Test Suite
  testFramework = 'vitest',
  onTestFrameworkChange,
  onCopyTests,
  testsCopied = false,

  // Git / PR
  onCreatePR,
  isSubmittingPR = false
}: HeaderProps) => {
  return (
    <header className="h-12 w-full bg-[#080d1a] flex items-center justify-between px-4 border-b border-vault-border z-30 select-none print:hidden">
      
      {/* Left side: Logo & Repo Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-vault-accent" />
          <span className="font-bold text-white tracking-tight">VaultDoc</span>
        </div>
        
        <button 
          onClick={onSelectRepo}
          className="flex items-center gap-2 bg-vault-panel hover:bg-vault-card transition-colors px-3 py-1 rounded-full text-xs text-slate-300 border border-vault-border shadow-sm">
          <span className="text-cyan-400">📁</span> {repoName || 'Select Repository'}
          <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
        </button>
      </div>

      {/* Center: Dynamic Context-Aware Workspace Toolbar */}
      <div className="flex items-center justify-center gap-3">
        
        {/* === Docs Workspace Header === */}
        {activeTab === 'docs' && (
          <div className="flex items-center gap-1 text-xs text-vault-textBody select-none bg-[#0a1020] px-2 py-0.5 rounded-lg border border-vault-border/60">
            <ToolbarBtn active={activeFormats?.h1} onClick={() => onInsertMarkdown?.('h1')} className="font-bold" title="Heading 1">H1</ToolbarBtn>
            <ToolbarBtn active={activeFormats?.h2} onClick={() => onInsertMarkdown?.('h2')} className="font-bold" title="Heading 2">H2</ToolbarBtn>
            <ToolbarBtn active={activeFormats?.h3} onClick={() => onInsertMarkdown?.('h3')} className="font-bold" title="Heading 3">H3</ToolbarBtn>
            <ToolbarBtn active={activeFormats?.bold} onClick={() => onInsertMarkdown?.('bold')} className="font-serif italic font-bold" title="Bold">B</ToolbarBtn>
            <ToolbarBtn active={activeFormats?.italic} onClick={() => onInsertMarkdown?.('italic')} className="italic" title="Italic">I</ToolbarBtn>
            <ToolbarBtn active={activeFormats?.strikethrough} onClick={() => onInsertMarkdown?.('strikethrough')} className="line-through" title="Strikethrough">~~</ToolbarBtn>
            <ToolbarBtn active={activeFormats?.code} onClick={() => onInsertMarkdown?.('code')} className="font-mono" title="Inline Code">` `</ToolbarBtn>
            
            <span className="w-[1px] h-3 bg-vault-border mx-1" />
            
            <ToolbarBtn active={activeFormats?.table} onClick={() => onInsertMarkdown?.('table')} title="Markdown Table"><Table className="w-3 h-3"/> Table</ToolbarBtn>
            <ToolbarBtn active={activeFormats?.link} onClick={() => onInsertMarkdown?.('link')} title="Hyperlink"><Link className="w-3 h-3"/> Link</ToolbarBtn>
            <ToolbarBtn active={activeFormats?.hr} onClick={() => onInsertMarkdown?.('hr')} title="Horizontal Rule"><Minus className="w-3 h-3"/> HR</ToolbarBtn>
          </div>
        )}

        {/* === Architecture Workspace Header === */}
        {activeTab === 'architecture' && (
          <div className="flex items-center gap-2 bg-[#0a1020] px-3 py-1 rounded-lg border border-vault-border/60 text-xs">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium">Interactive System Architecture Engine</span>
          </div>
        )}

        {/* === Pre-PR Review Header === */}
        {activeTab === 'audit' && (
          <div className="flex items-center gap-2 bg-[#0a1020] px-3 py-1 rounded-lg border border-vault-border/60 text-xs">
            <span className="text-slate-400 font-medium">Filter Severity:</span>
            {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => onSeverityFilterChange?.(sev)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                  severityFilter === sev
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        )}

        {/* === Ticket Spec Header === */}
        {activeTab === 'spec' && (
          <div className="flex items-center gap-2 bg-[#0a1020] px-3 py-1 rounded-lg border border-vault-border/60 text-xs">
            <span className="text-cyan-400 font-bold">Jira / Linear AST Cross-Referencer</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 text-[11px]">LanceDB 512-dim Cosine Matching</span>
          </div>
        )}

        {/* === Test Suite Header === */}
        {activeTab === 'tests' && (
          <div className="flex items-center gap-1 bg-[#0a1020] p-1 rounded-lg border border-vault-border/60">
            {(['vitest', 'jest', 'pytest', 'rust'] as const).map(fw => (
              <button
                key={fw}
                onClick={() => onTestFrameworkChange?.(fw)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase transition-all ${
                  testFramework === fw
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fw}
              </button>
            ))}
          </div>
        )}

        {/* === Git / PR Header === */}
        {activeTab === 'git' && (
          <div className="flex items-center gap-2 bg-[#0a1020] px-3 py-1 rounded-lg border border-vault-border/60 text-xs">
            <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium">Local GitHub Direct REST Client</span>
          </div>
        )}

        {/* === Chat Header === */}
        {activeTab === 'chat' && (
          <div className="flex items-center gap-2 bg-[#0a1020] px-3 py-1 rounded-lg border border-vault-border/60 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium">Air-Gapped Offline Assistant</span>
          </div>
        )}

        {/* Security Air-Gapped Pill */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors shadow-sm ${
          activeMode === 1
            ? 'bg-vault-security/15 border border-vault-security/30 text-vault-security shadow-[0_0_10px_rgba(16,185,129,0.15)]'
            : 'bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
        }`}>
          <Shield className="w-3 h-3" />
          <span className="font-semibold">{activeMode === 1 ? 'Air-Gapped Mode' : 'Cloud Mode'}</span>
        </div>
      </div>

      {/* Right Side: Consolidated Context Actions + Settings [⚙️] */}
      <div className="flex items-center gap-3">
        
        {/* Consolidated Actions for Docs Tab */}
        {activeTab === 'docs' && (
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onToggleDocViewMode}
              className="flex items-center gap-1.5 bg-vault-base hover:bg-vault-card border border-vault-border px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white transition-all active:scale-95"
              title={docViewMode === 'preview' ? "Switch to Raw Editor" : "Switch to Live Preview"}
            >
              {docViewMode === 'preview' ? <Edit3 className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{docViewMode === 'preview' ? 'Edit' : 'Preview'}</span>
            </button>
            <button 
              onClick={onExportDocMd}
              className="flex items-center gap-1.5 bg-vault-base hover:bg-vault-card border border-vault-border px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" /> <span>.MD</span>
            </button>
            <button 
              onClick={onExportDocPdf}
              className="flex items-center gap-1.5 bg-vault-base hover:bg-vault-card border border-vault-border px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white transition-all active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" /> <span>.PDF</span>
            </button>
            <button 
              onClick={onCopyDoc}
              className="flex items-center gap-1.5 bg-vault-base hover:bg-vault-card border border-vault-border px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white transition-all active:scale-95"
            >
              {docCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{docCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}



        {/* Consolidated Actions for Pre-PR Review */}
        {activeTab === 'audit' && (
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onRefreshDiff}
              className="flex items-center gap-1 bg-vault-base hover:bg-vault-card border border-vault-border px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> <span>Refresh</span>
            </button>
            <button 
              onClick={onRunAudit}
              disabled={isAuditing}
              className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1 rounded text-xs font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> <span>{isAuditing ? 'Auditing...' : 'Run Audit'}</span>
            </button>
          </div>
        )}

        {/* Consolidated Actions for Ticket Spec */}
        {activeTab === 'spec' && (
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onCopyTicketSpec}
              className="flex items-center gap-1.5 bg-vault-base hover:bg-vault-card border border-vault-border px-2.5 py-1 rounded text-xs text-slate-300 hover:text-white transition-all active:scale-95"
            >
              {ticketSpecCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{ticketSpecCopied ? 'Copied' : 'Copy Spec'}</span>
            </button>
            <button 
              onClick={onAnalyzeTicket}
              disabled={isAnalyzingTicket}
              className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1 rounded text-xs font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" /> <span>Analyze Spec</span>
            </button>
          </div>
        )}

        {/* Consolidated Actions for Test Suite */}
        {activeTab === 'tests' && (
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onCopyTests}
              className="flex items-center gap-1.5 bg-vault-base hover:bg-vault-card border border-vault-border px-3 py-1 rounded text-xs text-slate-300 hover:text-white transition-all active:scale-95"
            >
              {testsCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{testsCopied ? 'Copied' : 'Copy Tests'}</span>
            </button>
          </div>
        )}

        {/* Consolidated Actions for Git / PR */}
        {activeTab === 'git' && (
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onCreatePR}
              disabled={isSubmittingPR}
              className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1 rounded text-xs font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> <span>Create PR</span>
            </button>
          </div>
        )}

        <div className="w-[1px] h-4 bg-vault-border mx-1" />

        {/* Toggle Inspector Button */}
        <button
          onClick={onToggleInspector}
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${isInspectorOpen ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-100 hover:bg-vault-panel'}`}
          title="Toggle Context Inspector (Ctrl+B)"
        >
          <PanelRight className="w-4 h-4" />
        </button>

        {/* Settings Icon [⚙️] - Strictly Preserved */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg hover:bg-vault-panel text-slate-400 hover:text-slate-100 transition-colors"
          title="Runtime Configuration & Model Provider Settings (⚙️)"
        >
          <Settings className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </header>
  );
};

export default Header;
