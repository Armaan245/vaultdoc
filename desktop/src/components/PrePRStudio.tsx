import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Play, 
  RefreshCw, 
  Check, 
  Copy, 
  FileCode, 
  GitCommit, 
  FlaskConical, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import type { ASTSymbol } from '../services/vaultdoc';
import { getLocalGitDiff, type GitRepoState, type GitFileDiff } from '../services/git';
import { runPreFlightAudit, type PreFlightAuditResult, type AuditFinding, type AuditSeverity } from '../services/audit';

interface PrePRStudioProps {
  symbols: ASTSymbol[];
  selectedRepo?: string | null;
  activeSeverityFilter?: string;
  onSeverityFilterChange?: (filter: string) => void;
  onSelectFindingCitation?: (finding: AuditFinding) => void;
}

export const PrePRStudio = ({
  symbols,
  selectedRepo,
  activeSeverityFilter = 'all',
  onSeverityFilterChange,
  onSelectFindingCitation
}: PrePRStudioProps) => {
  const [gitState, setGitState] = useState<GitRepoState | null>(null);
  const [selectedFile, setSelectedFile] = useState<GitFileDiff | null>(null);
  const [auditResult, setAuditResult] = useState<PreFlightAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [_auditStatus, setAuditStatus] = useState<string>('Ready to audit');
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [copiedTest, setCopiedTest] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);

  // Load Git Diff on mount and when repo changes
  useEffect(() => {
    handleRefreshGit();
  }, [selectedRepo]);

  const handleRefreshGit = async () => {
    const state = await getLocalGitDiff(selectedRepo || undefined);
    setGitState(state);
    if (state.fileDiffs.length > 0) {
      setSelectedFile(state.fileDiffs[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleRunAudit = async () => {
    if (!gitState) return;
    setIsAuditing(true);
    setAuditStatus('Running parallel shift-left security & logic auditors...');
    try {
      const result = await runPreFlightAudit(
        gitState.fileDiffs,
        symbols,
        (msg) => setAuditStatus(msg)
      );
      setAuditResult(result);
      if (result.findings.length > 0) {
        setSelectedFinding(result.findings[0]);
      }
    } catch (err: any) {
      setAuditStatus(`Audit error: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  // Run audit on first mount if not ran yet
  useEffect(() => {
    if (gitState && !auditResult && !isAuditing) {
      handleRunAudit();
    }
  }, [gitState]);

  const findings = auditResult?.findings || [];
  const filteredFindings = findings.filter(f => {
    if (!activeSeverityFilter || activeSeverityFilter === 'all') return true;
    return f.severity.toLowerCase() === activeSeverityFilter.toLowerCase();
  });

  const getSeverityBadge = (sev: AuditSeverity) => {
    switch (sev) {
      case 'Critical':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'Warning':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Info':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    }
  };

  const handleFindingClick = (finding: AuditFinding) => {
    setSelectedFinding(finding);
    if (onSelectFindingCitation) {
      onSelectFindingCitation(finding);
    }
  };

  return (
    <div className="flex-1 h-full bg-[#080d1a] flex flex-col overflow-hidden">
      
      {/* Unified Top Header (Studio Section) */}
      <div className="h-14 flex items-center justify-between px-4 bg-[#0D0E13] border-b border-white/5 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-xs font-bold text-white tracking-wide uppercase">
                Shift-Left Pre-PR Review & Local Audit Engine
              </h2>
              <p className="text-[10px] text-slate-400">
                100% offline air-gapped security, edge case, and automated test analysis
              </p>
            </div>
          </div>
        </div>

        {/* Audit Metrics */}
        {auditResult && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-xs">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-300 font-bold">{auditResult.summary.criticalCount} Critical</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-300 font-bold">{auditResult.summary.warningCount} Warnings</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-medium">{auditResult.summary.passedChecks} Checks Passed</span>
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleRunAudit}
          disabled={isAuditing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95 disabled:opacity-50"
        >
          {isAuditing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Auditing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Run Local Audit</span>
            </>
          )}
        </button>
      </div>

      {/* Main 2-Column Split: Left Git Diff | Right Structured Findings & Tests */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Local Git Diff Inspector */}
        <div className="w-[45%] flex-shrink-0 border-r border-vault-border flex flex-col bg-[#070b16]">
          {/* File selector header */}
          <div className="p-3 border-b border-vault-border bg-[#090f20] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">
                Modified Files ({gitState?.fileDiffs.length || 0})
              </span>
            </div>
            <button
              onClick={handleRefreshGit}
              className="p-1 hover:bg-vault-panel rounded text-slate-400 hover:text-slate-200"
              title="Refresh Git Diff"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Files List Tabs */}
          <div className="flex items-center gap-1 p-2 bg-[#090f20]/60 border-b border-vault-border overflow-x-auto custom-scrollbar">
            {gitState?.fileDiffs.map(f => {
              const isSelected = selectedFile?.filePath === f.filePath;
              return (
                <button
                  key={f.filePath}
                  onClick={() => setSelectedFile(f)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-vault-panel'
                  }`}
                >
                  <FileCode className="w-3 h-3" />
                  <span>{f.filePath.split('/').pop()}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">+{f.addedCount}</span>
                  <span className="text-[10px] text-red-400 font-mono">-{f.deletedCount}</span>
                </button>
              );
            })}
          </div>

          {/* Diff Viewer Code Box */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono text-xs leading-relaxed select-text">
            {selectedFile ? (
              <div className="space-y-4">
                <div className="text-[11px] text-slate-400 pb-2 border-b border-vault-border flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{selectedFile.filePath}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-bold text-slate-300">
                    {selectedFile.status}
                  </span>
                </div>

                {selectedFile.hunks.map((hunk, hIdx) => (
                  <div key={hIdx} className="border border-vault-border rounded-lg overflow-hidden bg-[#0d1322]">
                    <div className="bg-[#090e1a] px-3 py-1 text-[10px] text-cyan-400 border-b border-vault-border/60">
                      {hunk.header}
                    </div>
                    <div className="py-1">
                      {hunk.lines.map((line, lIdx) => {
                        const isAdded = line.startsWith('+');
                        const isDeleted = line.startsWith('-');
                        return (
                          <div
                            key={lIdx}
                            className={`px-3 py-0.5 font-mono text-[11px] ${
                              isAdded
                                ? 'bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-400'
                                : isDeleted
                                  ? 'bg-red-500/15 text-red-300 border-l-2 border-red-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <ShieldCheck className="w-10 h-10 text-emerald-400 opacity-60 mb-2" />
                <h4 className="text-xs font-bold text-slate-200">Working tree clean.</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">No uncommitted local diffs detected.</p>
                <button
                  onClick={handleRefreshGit}
                  className="mt-3 px-3 py-1 bg-vault-card hover:bg-vault-panel border border-vault-border rounded text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Git Status</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Parallel Local Auditor Findings & Tests */}
        <div className="flex-1 flex flex-col bg-[#090e1c] overflow-hidden">
          
          {/* Findings Filter Bar */}
          <div className="p-3 border-b border-vault-border bg-[#0b1426] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                Auditor Findings ({filteredFindings.length})
              </span>
              <div className="flex items-center gap-1">
                {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
                  <button
                    key={sev}
                    onClick={() => onSeverityFilterChange?.(sev)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                      activeSeverityFilter === sev
                        ? 'bg-cyan-500 text-black shadow-sm'
                        : 'bg-vault-card border border-vault-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Parallel AST Inference
            </span>
          </div>

          {/* Findings Cards List */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {filteredFindings.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-bold">No findings for selected severity filter.</p>
                <p className="text-[11px] opacity-70 mt-1">Code adheres to air-gapped security & logic constraints.</p>
              </div>
            ) : (
              filteredFindings.map(finding => {
                const isSelected = selectedFinding?.id === finding.id;
                return (
                  <div
                    key={finding.id}
                    onClick={() => handleFindingClick(finding)}
                    className={`border rounded-xl p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#101b33] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'bg-[#0d1527] border-vault-border hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadge(finding.severity)}`}>
                          {finding.severity}
                        </span>
                        <span className="text-xs font-bold text-slate-100">
                          {finding.category}: {finding.symbol || 'Code Hunk'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {finding.confidence}% confidence
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-cyan-300 mb-2 flex items-center gap-1">
                      <FileCode className="w-3 h-3 text-cyan-400" />
                      <span>{finding.file}:{finding.line}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {finding.rationale}
                    </p>

                    {/* Flagged Snippet */}
                    {finding.codeSnippet && (
                      <div className="bg-[#070b16] border border-vault-border rounded-lg p-2.5 mb-3">
                        <div className="text-[9px] font-mono text-slate-500 mb-1">FLAGGED AST NODE:</div>
                        <code className="text-[11px] font-mono text-red-300 block whitespace-pre-wrap">
                          {finding.codeSnippet}
                        </code>
                      </div>
                    )}

                    {/* Fix Suggestion */}
                    {finding.fixSuggestion && (
                      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Shift-Left Fix Recommendation
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(finding.fixSuggestion || '');
                              setCopiedFix(true);
                              setTimeout(() => setCopiedFix(false), 2000);
                            }}
                            className="text-[10px] text-emerald-400 hover:text-white flex items-center gap-1"
                          >
                            {copiedFix ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedFix ? 'Copied' : 'Copy Fix'}</span>
                          </button>
                        </div>
                        <p className="text-xs text-emerald-200 font-mono leading-relaxed">
                          {finding.fixSuggestion}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Generated Unit Test Suite Card */}
          {auditResult?.generatedTests && (
            <div className="border-t border-vault-border bg-[#0b1428] p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Automated Test Suite for Flagged Edge Cases
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(auditResult.generatedTests);
                    setCopiedTest(true);
                    setTimeout(() => setCopiedTest(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-vault-base border border-vault-border hover:border-vault-accent text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
                >
                  {copiedTest ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                  <span>{copiedTest ? 'Copied' : 'Copy Test Suite'}</span>
                </button>
              </div>

              <div className="bg-[#070b14] border border-vault-border rounded-lg p-2.5 max-h-28 overflow-y-auto custom-scrollbar font-mono text-[10px] text-slate-300">
                <pre>{auditResult.generatedTests}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrePRStudio;
