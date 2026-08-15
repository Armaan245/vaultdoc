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

const SAMPLE_JIRA_TICKET = `[PROD-4092] Implement Secure Webhook Verification & Invoice Settlement Flow

Description:
As a backend developer, we need to ingest incoming webhook payloads from our payment gateway provider (Stripe / Adyen).
When an invoice is paid (event: invoice.paid), the service must verify the incoming cryptographic signature before triggering the internal settlement ledger.

Acceptance Criteria:
1. Parse raw webhook payload and verify HMAC SHA-256 signature header.
2. If signature fails, return HTTP 403 Forbidden immediately without modifying account state.
3. If signature passes, dispatch settlement job to user ledger and respond with HTTP 200 { status: 'acknowledged' }.
4. Ensure all database writes are wrapped in ACID transactions.`;

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
    <div className="flex-1 h-full bg-[#080d1a] flex flex-col overflow-hidden">
      
      {/* Top Header */}
      <div className="border-b border-vault-border bg-[#0b1224] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide uppercase">
              Ticket-to-Spec Clarifier & LanceDB Cross-Referencer
            </h2>
            <p className="text-[10px] text-slate-400">
              Cross-references Jira/Linear tickets against codebase AST nodes & surfaces ambiguities
            </p>
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !ticketInput.trim()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing AST Vectors...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyze & Clarify Spec</span>
            </>
          )}
        </button>
      </div>

      {/* Main 2-Column Split: Left Ticket Input | Right Clarified Spec & Questions */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Ticket Input Editor */}
        <div className="w-[45%] flex-shrink-0 border-r border-vault-border flex flex-col bg-[#070b16] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200">
              Input Ticket (Jira / Linear / User Story)
            </span>
            <button
              onClick={() => setTicketInput(SAMPLE_JIRA_TICKET)}
              className="text-[10px] text-cyan-400 hover:underline"
            >
              Load Sample Ticket
            </button>
          </div>

          <textarea
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value)}
            placeholder="Paste your Jira issue, Linear ticket, or feature spec here..."
            className="flex-1 w-full bg-[#0d1424] border border-vault-border rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors custom-scrollbar resize-none leading-relaxed"
          />

          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
            <span>Query vector embeddings across active repository symbols</span>
            <span className="font-mono">{ticketInput.length} chars</span>
          </div>
        </div>

        {/* Right Column: Clarified Spec, Questions & Impacted Files */}
        <div className="flex-1 flex flex-col bg-[#090e1c] overflow-hidden">
          
          {/* Tabs bar */}
          <div className="border-b border-vault-border bg-[#0b1426] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('spec')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'spec'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Technical Spec
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'questions'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Clarifications</span>
                {analysis && (
                  <span className="px-1.5 py-0.2 bg-purple-500/30 text-purple-300 rounded-full text-[9px]">
                    {analysis.clarificationQuestions.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('impact')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'impact'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Impacted AST</span>
                {analysis && (
                  <span className="px-1.5 py-0.2 bg-cyan-500/30 text-cyan-300 rounded-full text-[9px]">
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
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-vault-base border border-vault-border hover:border-vault-accent text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
                  >
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                    <span>Open in Docs Studio</span>
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-vault-base border border-vault-border hover:border-vault-accent text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                  <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {!analysis && !isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                <FileSignature className="w-12 h-12 text-cyan-400 opacity-40 mb-3" />
                <h3 className="text-sm font-bold text-slate-200 mb-1">Ready to Clarify Ticket</h3>
                <p className="text-xs max-w-sm">
                  Click <strong>Analyze & Clarify Spec</strong> above to cross-reference ticket requirements with your local codebase AST nodes.
                </p>
              </div>
            ) : isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                <h3 className="text-sm font-bold text-slate-200 mb-1">Querying LanceDB Index</h3>
                <p className="text-xs">Finding related functions, checking permissions, and generating edge-case questions...</p>
              </div>
            ) : (
              <div>
                {/* Spec View */}
                {activeTab === 'spec' && (
                  <div className="bg-[#0c1324] border border-vault-border rounded-xl p-5 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                    {analysis?.generatedSpecMarkdown}
                  </div>
                )}

                {/* Clarifications View */}
                {activeTab === 'questions' && (
                  <div className="space-y-4">
                    <div className="text-xs text-slate-300 mb-2">
                      Targeted clarifying questions generated from detected requirement gaps:
                    </div>
                    {analysis?.clarificationQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-[#0c1426] border border-vault-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-purple-400" />
                            <span>{idx + 1}. {q.topic}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {q.impactLevel} Impact
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 mb-3 leading-relaxed">
                          {q.question}
                        </p>
                        <div className="bg-[#070b16] border border-vault-border rounded-lg p-2.5 text-[11px] font-mono text-emerald-300">
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
                    <div className="text-xs text-slate-300 mb-2">
                      Codebase functions & files correlated with ticket keywords:
                    </div>
                    {analysis?.impactedComponents.map((comp, idx) => (
                      <div key={idx} className="bg-[#0c1426] border border-vault-border rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Code className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-bold text-slate-100 font-mono">
                              {comp.symbol}
                            </span>
                            <span className="text-[10px] text-slate-400">({comp.type})</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {comp.filePath}
                          </div>
                          <div className="text-xs text-slate-300 mt-1">
                            {comp.reason}
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <span className="text-xs font-mono text-cyan-400 font-bold">
                            {comp.relevanceScore}%
                          </span>
                          <span className="text-[9px] text-slate-500 uppercase">Relevance</span>
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
