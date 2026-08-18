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
  CheckCircle2,
  AlertTriangle
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
  symbols = [], 
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
    try {
      const state = await getLocalGitDiff(selectedRepo || undefined);
      setGitState(state);
      if (state.fileDiffs && state.fileDiffs.length > 0) {
        setSelectedFile(state.fileDiffs[0]);
      } else {
        setSelectedFile(null);
      }
    } catch (_) {
      setGitState(null);
      setSelectedFile(null);
    }
  };

  const handleRunAudit = async () => {
    if (!gitState || gitState.fileDiffs.length === 0) return;
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
      } else {
        setSelectedFinding(null);
      }
    } catch (err: any) {
      setAuditStatus(`Audit error: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  // Run audit when new diffs arrive
  useEffect(() => {
    if (gitState && gitState.fileDiffs.length > 0 && !auditResult && !isAuditing) {
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
        return 'bg-white/[0.04] text-red-300 border-red-500/30';
      case 'Warning':
        return 'bg-white/[0.04] text-amber-300 border-amber-500/30';
      case 'Info':
        return 'bg-white/[0.04] text-slate-300 border-white/10';
    }
  };

  const handleFindingClick = (finding: AuditFinding) => {
    setSelectedFinding(finding);
    if (onSelectFindingCitation) {
      onSelectFindingCitation(finding);
    }
  };

  return (
    <div className="flex-1 h-full bg-[#131316] flex flex-col overflow-hidden select-none font-sans">
      
      {/* 1. Flush Edge-to-Edge Sub-Header */}
      <div className="h-11 px-6 border-b border-white/[0.04] bg-[#131316] flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-medium text-white tracking-wide">
            Shift-Left Pre-PR Review
          </h2>
        </div>

        {/* Matte Neutral Slate Status Tags */}
        <div className="flex items-center gap-2.5">
          {auditResult && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400 stroke-[1.5]" />
                <span>{auditResult.summary.criticalCount} Critical</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>{auditResult.summary.warningCount} Warnings</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 text-xs font-mono font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 stroke-[1.5]" />
                <span>{auditResult.summary.passedChecks} Passed</span>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className={`flex items-center gap-1.5 font-medium text-xs px-3.5 py-1.5 rounded-lg transition-all ${
              !isAuditing
                ? 'bg-white hover:bg-slate-200 text-slate-950 cursor-pointer shadow-sm active:scale-95'
                : 'bg-[#222328] text-slate-500 border border-white/5 cursor-not-allowed opacity-80'
            }`}
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Run Local Audit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Left Git Diff | Right Structured Findings & Tests */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Modified Files & Diff Inspector */}
        <div className="w-[42%] flex-shrink-0 border-r border-white/[0.04] bg-[#131316] flex flex-col">
          {/* File selector header */}
          <div className="h-10 px-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <GitCommit className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">
                Modified Files ({gitState?.fileDiffs.length || 0})
              </span>
            </div>
            <button
              onClick={handleRefreshGit}
              className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Git Diff"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Files List Tabs */}
          {gitState && gitState.fileDiffs.length > 0 && (
            <div className="flex items-center gap-1.5 p-2 bg-white/[0.01] border-b border-white/[0.04] overflow-x-auto custom-scrollbar">
              {gitState.fileDiffs.map(f => {
                const isSelected = selectedFile?.filePath === f.filePath;
                return (
                  <button
                    key={f.filePath}
                    onClick={() => setSelectedFile(f)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/10 text-white border border-white/15 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <FileCode className="w-3 h-3 text-slate-400" />
                    <span>{f.filePath.split('/').pop()}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">+{f.addedCount}</span>
                    <span className="text-[10px] text-red-400 font-mono">-{f.deletedCount}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Diff Viewer Code Box */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono text-xs leading-relaxed select-text">
            {selectedFile ? (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400 pb-2 border-b border-white/[0.04] flex items-center justify-between">
                  <span className="font-medium text-slate-300 truncate max-w-[260px]">{selectedFile.filePath}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-semibold text-slate-400">
                    {selectedFile.status}
                  </span>
                </div>

                {selectedFile.hunks.map((hunk, hIdx) => (
                  <div key={hIdx} className="border border-white/[0.06] rounded-xl overflow-hidden bg-black/30">
                    <div className="bg-white/[0.02] px-3 py-1.5 text-[10px] text-slate-400 border-b border-white/[0.06] font-mono">
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
                                ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-400'
                                : isDeleted
                                  ? 'bg-red-500/10 text-red-300 border-l-2 border-red-400'
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
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6 text-slate-400 stroke-[1.5]" />
                </div>
                <h4 className="text-xs font-semibold text-slate-200">Working tree clean</h4>
                <p className="text-[11px] text-slate-500 mt-1">No uncommitted diffs detected in active workspace.</p>
                <button
                  onClick={handleRefreshGit}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-200 text-slate-950 font-medium text-xs rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Git Status</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Parallel Local Auditor Findings & Tests */}
        <div className="flex-1 flex flex-col bg-[#131316] overflow-hidden">
          
          {/* Findings Filter Bar with Centered Segmented Glass Pills */}
          <div className="h-10 px-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01] relative">
            {/* Left: Section title */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300">
                Auditor Findings ({filteredFindings.length})
              </span>
            </div>
            
            {/* Center: Segmented Pill [ ALL | CRITICAL | WARNING | INFO ] */}
            <div className="absolute left-1/2 -translate-x-1/2 bg-white/5 border border-white/5 rounded-lg p-0.5 text-xs inline-flex gap-0.5">
              {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => onSeverityFilterChange?.(sev)}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase transition-all cursor-pointer ${
                    activeSeverityFilter === sev
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Findings Cards List */}
          <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${filteredFindings.length === 0 ? 'flex flex-col items-center justify-center' : 'space-y-3'}`}>
            {filteredFindings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6 text-slate-400 stroke-[1.5]" />
                </div>
                <p className="text-xs font-semibold text-slate-200">No findings for selected severity filter.</p>
                <p className="text-[11px] text-slate-500 mt-1">Code adheres to air-gapped security & logic constraints.</p>
              </div>
            ) : (
              filteredFindings.map(finding => {
                const isSelected = selectedFinding?.id === finding.id;
                return (
                  <div
                    key={finding.id}
                    onClick={() => handleFindingClick(finding)}
                    className={`bg-white/[0.02] border rounded-2xl p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-white/20 bg-white/[0.04] shadow-md'
                        : 'border-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${getSeverityBadge(finding.severity)}`}>
                          {finding.severity}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {finding.category}: {finding.symbol || 'Code Hunk'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/10">
                        {finding.confidence}% confidence
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1.5">
                      <FileCode className="w-3 h-3 text-slate-400" />
                      <span>{finding.file}:{finding.line}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {finding.rationale}
                    </p>

                    {/* Flagged Snippet */}
                    {finding.codeSnippet && (
                      <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 mb-3">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Flagged AST Node:</div>
                        <code className="text-[11px] font-mono text-red-300/90 block whitespace-pre-wrap">
                          {finding.codeSnippet}
                        </code>
                      </div>
                    )}

                    {/* Fix Suggestion */}
                    {finding.fixSuggestion && (
                      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Shift-Left Fix Recommendation
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(finding.fixSuggestion || '');
                              setCopiedFix(true);
                              setTimeout(() => setCopiedFix(false), 2000);
                            }}
                            className="text-[10px] text-emerald-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedFix ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedFix ? 'Copied' : 'Apply Shift-Left Fix'}</span>
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
            <div className="border-t border-white/[0.04] bg-white/[0.01] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Automated Test Suite for Flagged Edge Cases
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(auditResult.generatedTests);
                    setCopiedTest(true);
                    setTimeout(() => setCopiedTest(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  {copiedTest ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{copiedTest ? 'Copied' : 'Copy Test Suite'}</span>
                </button>
              </div>

              <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 max-h-28 overflow-y-auto custom-scrollbar font-mono text-[10px] text-slate-300">
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
