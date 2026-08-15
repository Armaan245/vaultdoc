import { ShieldCheck, Database, Cpu, GitBranch, Sparkles } from 'lucide-react';

interface FooterStatusBarProps {
  engineStatus: string;
  isBusy?: boolean;
  activeMode: 1 | 2;
  symbolCount?: number;
  currentBranch?: string;
  providerModel?: string;
}

export const FooterStatusBar = ({
  engineStatus = 'Ready',
  isBusy = false,
  activeMode = 1,
  symbolCount = 0,
  currentBranch = 'main'
}: FooterStatusBarProps) => {
  return (
    <footer className="h-7 w-full bg-[#080d1a] border-t border-vault-border flex items-center justify-between px-3 text-[11px] font-mono text-slate-400 select-none z-30 print:hidden">
      {/* Left: Dynamic Engine Status */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isBusy 
              ? 'bg-cyan-400 animate-ping' 
              : activeMode === 1 
                ? 'bg-emerald-400' 
                : 'bg-amber-400'
          }`} />
          <span className="text-slate-300 font-medium truncate max-w-[320px]">
            {engineStatus}
          </span>
        </div>

        {isBusy && (
          <span className="text-[10px] text-cyan-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 animate-spin" /> processing
          </span>
        )}
      </div>

      {/* Right: Telemetry Chips */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Branch Info */}
        <div className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors">
          <GitBranch className="w-3 h-3 text-vault-accent" />
          <span>{currentBranch}</span>
        </div>

        <span className="text-vault-border opacity-60">•</span>

        {/* AST Nodes Count */}
        <div className="flex items-center gap-1 text-slate-400" title="Parsed AST symbols in active workspace">
          <Cpu className="w-3 h-3 text-vault-codeHighlight" />
          <span>{symbolCount} AST Nodes</span>
        </div>

        <span className="text-vault-border opacity-60">•</span>

        {/* Vector DB Engine */}
        <div className="flex items-center gap-1 text-slate-400" title="Local LanceDB Vector Store (512-dim Cosine Metric)">
          <Database className="w-3 h-3 text-emerald-400" />
          <span>lancedb · 512-dim · cosine</span>
        </div>

        <span className="text-vault-border opacity-60">•</span>

        {/* Air-Gapped Security Indicator */}
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
          activeMode === 1
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
        }`}>
          <ShieldCheck className="w-3 h-3" />
          <span>{activeMode === 1 ? '100% Air-Gapped' : 'Enterprise Cloud'}</span>
        </div>
      </div>
    </footer>
  );
};

export default FooterStatusBar;
