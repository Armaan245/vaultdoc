import { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Copy, 
  Check, 
  X, 
  Loader2, 
  Database, 
  Code, 
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { lanceDb, explainChunk } from '../services/vaultdoc';
import type { RAGChunk } from '../services/vaultdoc';
import { getStoredProviderConfig } from '../services/ai';

interface RagCardProps {
  chunk: RAGChunk;
  onExplain: (chunk: RAGChunk) => void;
  isFocused?: boolean;
}

const RagCard = ({ chunk, onExplain, isFocused = false }: RagCardProps) => {
  const [isExpanded, setIsExpanded] = useState(isFocused);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isFocused) setIsExpanded(true);
  }, [isFocused]);

  const distanceScore = Math.max(0, 1 - chunk.distance);
  const matchPerc = Math.round(distanceScore * 100);

  let matchColor: 'green' | 'cyan' | 'orange' = 'green';
  if (matchPerc < 90 && matchPerc >= 80) matchColor = 'cyan';
  if (matchPerc < 80) matchColor = 'orange';

  const colorMap = {
    green: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    orange: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  };

  const file = chunk.file || (chunk as any).filePath || 'Unknown file';
  const desc = `${chunk.symbol} (${chunk.type})`;
  const codeSnippet = chunk.code || (chunk as any).content || '';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border-b border-vault-border p-3.5 transition-all group relative select-none ${
      isFocused 
        ? 'bg-cyan-500/15 border-l-4 border-l-cyan-400' 
        : 'hover:bg-vault-card/60 bg-[#090f1e]/40'
    }`}>
      {/* Top row: File & Percentage */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-start justify-between gap-2 cursor-pointer mb-2"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-vault-codeHighlight tracking-wider truncate">
            <FileText className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="truncate">{file}</span>
          </div>
          <div className="text-xs text-slate-300 font-medium mt-0.5 truncate flex items-center gap-1">
            <span>{desc}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-bold ${colorMap[matchColor]}`}>
            {matchPerc}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExplain(chunk);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-transparent border border-cyan-500/60 text-cyan-300 hover:bg-cyan-500 hover:text-black transition-all active:scale-95 shadow-sm"
            title="Explain code chunk with local LLM"
          >
            <Sparkles className="w-3 h-3" />
            <span>Explain</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-200 p-0.5"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Code Snippet */}
      {isExpanded && (
        <div className="bg-[#060a14] border border-vault-border/80 rounded-lg p-2.5 overflow-hidden mt-2 animate-fadeIn">
          <div className="flex items-center justify-between mb-1 text-[9px] text-slate-500 font-mono">
            <span>AST SNIPPET</span>
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-white flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="text-[10px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar select-text">
            <code>{codeSnippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

interface RAGInspectorProps {
  chunks: RAGChunk[];
  focusedTarget?: { file?: string; symbol?: string } | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export const RAGInspector = ({ chunks, focusedTarget, isOpen = true, onClose }: RAGInspectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [globalChunks, setGlobalChunks] = useState<RAGChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Explainer Modal Overlay State
  const [activeChunk, setActiveChunk] = useState<RAGChunk | null>(null);
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync focused target from architecture canvas or pre-pr review into search or filter
  useEffect(() => {
    if (focusedTarget?.symbol) {
      setSearchQuery(focusedTarget.symbol);
    }
  }, [focusedTarget]);

  const isGlobalSearch = searchQuery.trim().length >= 3;

  // Dynamic LanceDB search when query >= 3 chars
  useEffect(() => {
    let isMounted = true;
    if (isGlobalSearch) {
      setIsSearching(true);
      lanceDb.search(searchQuery, { limit: 12 }).then((results) => {
        if (isMounted) {
          setGlobalChunks(results);
          setIsSearching(false);
        }
      }).catch(err => {
        console.error('Global search error:', err);
        if (isMounted) setIsSearching(false);
      });
    } else {
      setGlobalChunks([]);
      setIsSearching(false);
    }
    return () => {
      isMounted = false;
    };
  }, [searchQuery, isGlobalSearch]);

  const displayChunks = isGlobalSearch ? globalChunks : chunks.filter((chunk) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesFile = (chunk.file || (chunk as any).filePath)?.toLowerCase().includes(query);
    const matchesSymbol = chunk.symbol?.toLowerCase().includes(query);
    const matchesType = chunk.type?.toLowerCase().includes(query);
    const matchesCode = (chunk.code || (chunk as any).content)?.toLowerCase().includes(query);
    return matchesFile || matchesSymbol || matchesType || matchesCode;
  });

  const handleExplain = (chunk: RAGChunk) => {
    setActiveChunk(chunk);
    setExplanation('');
    setExplainError(null);
    setIsExplaining(true);

    explainChunk(
      chunk,
      (token) => {
        setExplanation((prev) => prev + token);
      },
      (err) => {
        setExplainError(err);
        setIsExplaining(false);
      },
      () => {
        setIsExplaining(false);
      }
    );
  };

  const handleCopyExplanation = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const providerConfig = getStoredProviderConfig();

  return (
    <aside className={`flex-shrink-0 h-full bg-[#080d1a] border-l border-vault-border flex flex-col relative z-10 shadow-[-5px_0_15px_rgba(0,0,0,0.2)] print:hidden select-none transition-[width,min-width,max-width,opacity] duration-300 ease-in-out ${
      isOpen ? 'w-[360px] opacity-100' : 'w-0 overflow-hidden border-none opacity-0'
    }`}>
      
      {/* Inspector Header */}
      <div className="p-4 border-b border-vault-border bg-[#0b1224] w-[360px]">
        <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
          <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5 min-w-0 truncate">
            <Database className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="truncate">RAG Context Inspector</span>
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border flex-shrink-0 ${
            displayChunks.length > 0 
              ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' 
              : 'bg-vault-border/30 text-slate-500 border-vault-border/50'
          }`}>
            {isGlobalSearch ? `GLOBAL (${displayChunks.length})` : `TOP ${String(chunks.length).padStart(2, '0')}`}
          </span>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-vault-border/40 rounded-lg text-slate-400 hover:text-slate-100 transition-colors ml-1"
            title="Collapse Inspector (Ctrl+B)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-[10px] text-slate-400 mb-3">
          {isGlobalSearch ? 'LanceDB Global Vector Similarity Index' : 'Ingested AST Chunks (512-dim Cosine)'}
        </p>

        {/* Instant Search Bar Input */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter chunks by symbol, file, type..." 
              className="w-full bg-[#060a14] border border-vault-border rounded-lg py-1.5 pl-8 pr-7 text-xs text-slate-200 outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Badge Indicator */}
          {isGlobalSearch && (
            <div className="flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="w-2.5 h-2.5 text-cyan-300 animate-spin" style={{ animationDuration: '3s' }} />
                Global Vector Search
              </span>
              {isSearching && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> Searching...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chunks List - Full Vertical Height */}
      <div className="flex-1 overflow-y-auto custom-scrollbar w-[360px]">
        {isSearching ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Querying LanceDB cosine vector embeddings...</span>
          </div>
        ) : displayChunks.length === 0 ? (
          <div className="p-6 text-xs text-slate-400 text-center mt-8">
            <Database className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            {isGlobalSearch ? (
              `No global chunks found matching "${searchQuery}"`
            ) : chunks.length === 0 ? (
              'No chunks retrieved yet. Select a preset, click an Architecture node, or type >=3 characters to query LanceDB.'
            ) : (
              `No matching chunks found for "${searchQuery}"`
            )}
          </div>
        ) : (
          displayChunks.map((c, i) => (
            <RagCard 
              key={`${c.file || (c as any).filePath}-${c.symbol}-${i}`}
              chunk={c}
              onExplain={handleExplain}
              isFocused={Boolean(focusedTarget?.symbol && (c.symbol === focusedTarget.symbol || c.file?.includes(focusedTarget.symbol)))}
            />
          ))
        )}
      </div>

      {/* Interactive Chunk Explainer Modal Overlay */}
      {activeChunk && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 print:hidden animate-fadeIn">
          <div className="bg-[#0b1224] border border-vault-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-200">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-vault-border bg-[#070b16] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Code Chunk Explainer (Offline AI)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Analysis generated by on-device model: <span className="font-mono text-cyan-400">{providerConfig.model}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {explanation && (
                  <button
                    onClick={handleCopyExplanation}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#0b1428] border border-vault-border hover:border-cyan-400 text-slate-300 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setActiveChunk(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-vault-border/40 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chunk Context Subheader */}
            <div className="px-4 py-2 bg-[#080e1c] border-b border-vault-border/60 flex items-center justify-between text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2 truncate">
                <Code className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="text-cyan-300 font-bold">{activeChunk.file || (activeChunk as any).filePath}</span>
                <span className="text-slate-600">|</span>
                <span className="text-white">{activeChunk.symbol}</span>
                <span className="text-slate-500">({activeChunk.type})</span>
              </div>
            </div>

            {/* Modal Body: Explanation Viewer */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              
              {/* Code Snippet Box */}
              <div className="bg-[#050812] border border-vault-border rounded-lg p-3 overflow-hidden">
                <div className="text-[10px] font-mono text-slate-500 mb-1">INPUT AST CODE CHUNK</div>
                <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto custom-scrollbar select-text">
                  <code>{activeChunk.code || (activeChunk as any).content}</code>
                </pre>
              </div>

              {/* Explanation Card */}
              <div className="bg-[#080d1a] border border-vault-border rounded-lg p-4 relative min-h-[160px]">
                <div className="flex items-center justify-between mb-3 border-b border-vault-border/50 pb-2">
                  <div className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Structured AST Analysis
                  </div>
                  {isExplaining && (
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Streaming local analysis...</span>
                    </div>
                  )}
                </div>

                {explainError ? (
                  <div className="p-3 bg-red-950/40 border border-red-500/40 rounded text-xs text-red-300">
                    ⚠️ {explainError}
                  </div>
                ) : explanation ? (
                  <div className="markdown-body prose prose-invert prose-xs max-w-none text-slate-200 leading-relaxed select-text">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {explanation}
                    </ReactMarkdown>
                  </div>
                ) : isExplaining ? (
                  <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>Connecting to {providerConfig.model} (100% offline)...</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-vault-border bg-[#070b16] flex items-center justify-between text-[11px] text-slate-400">
              <span>VaultDoc Air-Gapped Code Intelligence</span>
              <button
                onClick={() => setActiveChunk(null)}
                className="px-3 py-1 rounded bg-vault-border/60 hover:bg-vault-border text-white text-xs transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </aside>
  );
};

export default RAGInspector;
