import { useState } from 'react';
import { 
  FileSignature, 
  Sparkles, 
  HelpCircle, 
  Copy, 
  Check, 
  Code, 
  Loader2, 
  ArrowRight
} from 'lucide-react';
import type { ASTSymbol } from '../services/vaultdoc';
import { analyzeTicketSpec, type TicketSpecAnalysis } from '../services/ticketSpec';

interface TicketSpecStudioProps {
  symbols: ASTSymbol[];
  onExportToDocs?: (specMarkdown: string) => void;
}

export const TicketSpecStudio = ({
  symbols,
  onExportToDocs
}: TicketSpecStudioProps) => {
  const [ticketInput, setTicketInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TicketSpecAnalysis | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'spec' | 'questions' | 'impact'>('spec');

  const handleAnalyze = async () => {
    if (!ticketInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeTicketSpec(ticketInput, symbols);
      setAnalysis(res);
    } catch (err) {
      console.error('Ticket analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis.generatedSpecMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 h-full bg-[#131316] flex flex-col overflow-hidden font-sans select-none">
      
      {/* 1. Flush Edge-to-Edge Sub-Header */}
      <div className="h-11 px-6 border-b border-white/[0.04] bg-[#131316] flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <FileSignature className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-medium text-white tracking-wide">
            Ticket-to-Spec Clarifier
          </h2>
        </div>

        {/* Primary Action Button */}
        {(() => {
          const canAnalyze = Boolean(!isAnalyzing && ticketInput.trim());
          return (
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className={`flex items-center gap-1.5 font-medium text-xs px-3.5 py-1.5 rounded-lg transition-all ${
                canAnalyze
                  ? 'bg-white hover:bg-slate-200 text-slate-950 cursor-pointer shadow-sm active:scale-95'
                  : 'bg-[#222328] text-slate-500 border border-white/5 cursor-not-allowed opacity-80'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[1.5]" />
                  <span>Analyzing AST Vectors...</span>
                </>
              ) : (
                <>
                  <Sparkles className={`w-3.5 h-3.5 ${canAnalyze ? 'fill-slate-950 text-slate-950' : 'text-slate-500'}`} />
                  <span>Analyze & Clarify Spec</span>
                </>
              )}
            </button>
          );
        })()}
      </div>

      {/* Main 2-Column Split: Left Ticket Input | Right Clarified Spec & Questions */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Ticket Input Editor */}
        <div className="w-[42%] flex-shrink-0 border-r border-white/5 bg-[#0D0E14]/40 flex flex-col p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Input Ticket (Jira / Linear / User Story)
            </span>
          </div>

          {/* Glass Card Container for Textarea */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex-1 flex flex-col transition-all focus-within:border-white/15">
            <textarea
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="Paste your Jira issue, Linear ticket, or feature spec here..."
              className="flex-1 w-full bg-transparent font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed custom-scrollbar placeholder:text-slate-600"
            />

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>LanceDB AST embeddings reference</span>
              <span>{ticketInput.length} chars</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clarified Spec, Questions & Impacted Files */}
        <div className="flex-1 flex flex-col bg-[#0A0B10] overflow-hidden">
          
          {/* Tabs Bar with Segmented Glass Pills */}
          <div className="h-11 border-b border-white/5 bg-black/10 px-5 flex items-center justify-between">
            <div className="bg-white/5 border border-white/10 rounded-xl p-0.5 text-xs flex gap-0.5">
              <button
                onClick={() => setActiveTab('spec')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'spec'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Technical Spec
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'questions'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Clarifications</span>
                {analysis && (
                  <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded-full text-[9px] font-mono">
                    {analysis.clarificationQuestions.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('impact')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'impact'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Impacted AST</span>
                {analysis && (
                  <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-300 rounded-full text-[9px] font-mono">
                    {analysis.impactedComponents.length}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Actions */}
            {analysis && (
              <div className="flex items-center gap-2">
                {onExportToDocs && (
                  <button
                    onClick={() => onExportToDocs(analysis.generatedSpecMarkdown)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3 text-sky-400" />
                    <span>Open in Docs</span>
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-sky-400" />}
                  <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {!analysis && !isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
                  <FileSignature className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Ready to Clarify Ticket</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Click <strong>Analyze & Clarify Spec</strong> above to cross-reference ticket requirements with your local codebase AST nodes.
                </p>
              </div>
            ) : isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1">Querying LanceDB Index</h3>
                <p className="text-xs text-slate-500">Finding related functions, checking permissions, and generating edge-case questions...</p>
              </div>
            ) : (
              <div>
                {/* Spec View */}
                {activeTab === 'spec' && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                    {analysis?.generatedSpecMarkdown}
                  </div>
                )}

                {/* Clarifications View */}
                {activeTab === 'questions' && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-400 mb-2">
                      Targeted clarifying questions generated from detected requirement gaps:
                    </div>
                    {analysis?.clarificationQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-purple-400" />
                            <span>{idx + 1}. {q.topic}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {q.impactLevel} Impact
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 mb-3 leading-relaxed">
                          {q.question}
                        </p>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-[11px] font-mono text-emerald-300">
                          <span className="text-slate-500 font-bold">Suggested Default: </span>
                          {q.suggestedDefault}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Impacted Components View */}
                {activeTab === 'impact' && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-400 mb-2">
                      Codebase functions & files correlated with ticket keywords:
                    </div>
                    {analysis?.impactedComponents.map((comp, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Code className="w-4 h-4 text-sky-400" />
                            <span className="text-xs font-semibold text-white font-mono">
                              {comp.symbol}
                            </span>
                            <span className="text-[10px] text-slate-500">({comp.type})</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {comp.filePath}
                          </div>
                          <div className="text-xs text-slate-300 mt-1">
                            {comp.reason}
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <span className="text-xs font-mono text-sky-400 font-bold">
                            {comp.relevanceScore}%
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider">Relevance</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketSpecStudio;
