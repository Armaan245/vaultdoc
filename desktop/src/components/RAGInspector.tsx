import { useState, useEffect } from 'react';
import { Search, Sparkles, Copy, Check, X, Loader2, Database, Code, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { lanceDb, explainChunk } from '../services/vaultdoc';
import type { RAGChunk } from '../services/vaultdoc';
import { getStoredProviderConfig } from '../services/ai';

interface RagCardProps {
  chunk: RAGChunk;
  onExplain: (chunk: RAGChunk) => void;
}

const RagCard = ({ chunk, onExplain }: RagCardProps) => {
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

  return (
    <div className="border-b border-vault-border p-3 hover:bg-vault-card/60 transition-colors group relative">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-vault-codeHighlight tracking-wider truncate">
            <FileText className="w-3 h-3 text-vault-accent flex-shrink-0" />
            <span className="truncate">{file}</span>
          </div>
          <div className="text-xs text-vault-textBody opacity-80 mt-0.5 truncate">{desc}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-2 py-1 rounded-md text-[10px] font-mono border ${colorMap[matchColor]}`}>
            {matchPerc}%
          </span>
          <button
            onClick={() => onExplain(chunk)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-transparent border border-[#0284c7] text-[#0284c7] hover:bg-[#0284c7] hover:text-white hover:border-[#0284c7] transition-all duration-150 ease-in-out active:scale-95 cursor-pointer shadow-sm"
            title="Explain code chunk with active AI model"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explain</span>
          </button>
        </div>
      </div>

      <div className="bg-vault-base border border-vault-border rounded p-2 overflow-hidden">
        <pre className="text-[10px] font-mono text-vault-textBody leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar">
          <code>{codeSnippet.substring(0, 200)}{codeSnippet.length > 200 ? '...' : ''}</code>
        </pre>
      </div>
    </div>
  );
};

const RAGInspector = ({ chunks }: { chunks: RAGChunk[] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [globalChunks, setGlobalChunks] = useState<RAGChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Explainer Modal Overlay State
  const [activeChunk, setActiveChunk] = useState<RAGChunk | null>(null);
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isGlobalSearch = searchQuery.trim().length >= 3;

  // Dynamic LanceDB search when query >= 3 chars
  useEffect(() => {
    let isMounted = true;
    if (isGlobalSearch) {
      setIsSearching(true);
      lanceDb.search(searchQuery, { limit: 10 }).then((results) => {
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
    <div className="w-[340px] flex-shrink-0 h-full bg-vault-panel border-l border-vault-border flex flex-col relative z-10 shadow-[-5px_0_15px_rgba(0,0,0,0.15)] print:hidden">
      
      {/* Inspector Header */}
      <div className="p-4 border-b border-vault-border">
        <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
          <h3 className="text-xs font-semibold text-vault-textBody tracking-wider uppercase flex items-center gap-1.5 min-w-0 truncate">
            <Database className="w-3.5 h-3.5 text-vault-accent flex-shrink-0" />
            <span className="truncate">RAG Context Inspector</span>
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border flex-shrink-0 ${
            displayChunks.length > 0 
              ? 'bg-vault-accent/15 text-vault-accent border-vault-accent/30' 
              : 'bg-vault-border/30 text-vault-textBody/50 border-vault-border/50'
          }`}>
            {isGlobalSearch ? `GLOBAL (${displayChunks.length})` : `TOP ${String(chunks.length).padStart(2, '0')}`}
          </span>
        </div>
        
        <p className="text-[10px] text-vault-textBody opacity-60 mb-3">
          {isGlobalSearch ? 'LanceDB Global Similarity Index' : 'Retrieved AST Chunks (LanceDB)'}
        </p>

        {/* Search Bar Input */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-vault-textBody opacity-50" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter chunks..." 
              className="w-full bg-vault-base border border-vault-border rounded py-1.5 pl-8 pr-3 text-xs text-vault-textPrimary outline-none focus:border-vault-accent transition-colors placeholder:text-vault-textBody/50"
            />
          </div>

          {/* Search Badge Indicator */}
          {isGlobalSearch && (
            <div className="flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="w-2.5 h-2.5 text-cyan-300 animate-spin" style={{ animationDuration: '3s' }} />
                Global Index Search
              </span>
              {isSearching && (
                <span className="text-[10px] text-vault-textBody/70 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> Searching...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chunks List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isSearching ? (
          <div className="p-8 text-center text-xs text-vault-textBody opacity-60 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-vault-accent" />
            <span>Querying LanceDB global vector index...</span>
          </div>
        ) : displayChunks.length === 0 ? (
          <div className="p-4 text-xs text-vault-textBody opacity-60 text-center mt-10">
            {isGlobalSearch ? (
              `No global chunks found matching "${searchQuery}"`
            ) : chunks.length === 0 ? (
              'No chunks retrieved yet. Select a preset or type a query (>=3 chars) to search global index.'
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
            />
          ))
        )}
      </div>

      {/* Inspector Footer - Aligned with EditorStudio bottom bar height & border */}
      <div className="py-2.5 px-4 border-t border-vault-border bg-vault-panel/90 backdrop-blur-md text-center flex items-center justify-center min-h-[49px]">
        <span className="text-[10px] text-vault-textBody opacity-60 tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span> lancedb • 512-dim • cosine
        </span>
      </div>

      {/* Interactive Chunk Explainer Overlay Modal */}
      {activeChunk && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden animate-fadeIn">
          <div className="bg-vault-panel border border-vault-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-vault-textPrimary">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-vault-border bg-vault-base/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-vault-textPrimary flex items-center gap-2">
                    Code Chunk Explainer
                  </h3>
                  <p className="text-[11px] text-vault-textBody opacity-70">
                    AI Analysis powered by <span className="font-mono text-vault-accent">{providerConfig.model}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {explanation && (
                  <button
                    onClick={handleCopyExplanation}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-vault-base border border-vault-border hover:border-vault-accent text-vault-textBody hover:text-vault-textPrimary transition-colors"
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
                  className="p-1 rounded-lg text-vault-textBody opacity-60 hover:opacity-100 hover:bg-vault-border/40 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chunk Context Subheader */}
            <div className="px-4 py-2.5 bg-vault-base/40 border-b border-vault-border/60 flex items-center justify-between text-xs font-mono text-vault-textBody">
              <div className="flex items-center gap-2 truncate">
                <Code className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="text-vault-codeHighlight font-bold">{activeChunk.file || (activeChunk as any).filePath}</span>
                <span className="text-vault-border">|</span>
                <span className="text-vault-accent">{activeChunk.symbol}</span>
                <span className="text-vault-textBody/60">({activeChunk.type})</span>
              </div>
            </div>

            {/* Modal Body: Explanation Viewer */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              
              {/* Code Snippet Box */}
              <div className="bg-vault-base border border-vault-border rounded-lg p-3 overflow-hidden">
                <div className="text-[10px] font-mono text-vault-textBody opacity-60 mb-1 flex items-center justify-between">
                  <span>INPUT CODE CHUNK</span>
                </div>
                <pre className="text-[11px] font-mono text-vault-textBody leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto custom-scrollbar">
                  <code>{activeChunk.code || (activeChunk as any).content}</code>
                </pre>
              </div>

              {/* Explanation Card */}
              <div className="bg-vault-base/70 border border-vault-border rounded-lg p-4 relative min-h-[160px]">
                <div className="flex items-center justify-between mb-3 border-b border-vault-border/50 pb-2">
                  <div className="text-xs font-bold text-vault-textPrimary tracking-wide uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Structured Explanation
                  </div>
                  {isExplaining && (
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Streaming AI Analysis...</span>
                    </div>
                  )}
                </div>

                {explainError ? (
                  <div className="p-3 bg-red-950/40 border border-red-500/40 rounded text-xs text-red-300">
                    ⚠️ {explainError}
                  </div>
                ) : explanation ? (
                  <div className="prose prose-invert prose-xs max-w-none text-vault-textBody leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {explanation}
                    </ReactMarkdown>
                  </div>
                ) : isExplaining ? (
                  <div className="flex flex-col items-center justify-center py-8 text-xs text-vault-textBody opacity-60 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>Connecting to {providerConfig.model}...</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-vault-border bg-vault-base/60 flex items-center justify-between text-[11px] text-vault-textBody opacity-70">
              <span>VaultDoc RAG Explainer Pipeline</span>
              <button
                onClick={() => setActiveChunk(null)}
                className="px-3 py-1 rounded bg-vault-border/40 hover:bg-vault-border text-vault-textPrimary transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default RAGInspector;
