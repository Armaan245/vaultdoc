import { Search } from 'lucide-react';
import type { RAGChunk } from '../services/vaultdoc';

const RagCard = ({
  file,
  desc,
  match,
  matchColor,
  codeSnippet
}: {
  file: string,
  desc: string,
  match: string,
  matchColor: 'green' | 'cyan' | 'orange',
  codeSnippet: string
}) => {
  const colorMap = {
    'green': 'text-vault-security border-vault-security/40 bg-vault-security/15',
    'cyan': 'text-vault-accent border-vault-accent/40 bg-vault-accent/15',
    'orange': 'text-vault-orange border-vault-orange/40 bg-vault-orange/15'
  };

  return (
    <div className="border-b border-vault-border p-3 hover:bg-vault-card transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[11px] font-bold text-vault-codeHighlight tracking-wider">{file}</div>
          <div className="text-xs text-vault-textBody opacity-80 mt-0.5">{desc}</div>
        </div>
        <div className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${colorMap[matchColor]}`}>
          {match}
        </div>
      </div>
      
      <div className="bg-vault-base border border-vault-border rounded p-2 overflow-hidden">
        <pre className="text-[10px] font-mono text-vault-textBody leading-relaxed whitespace-pre-wrap">
          <code>{codeSnippet.substring(0, 150)}{codeSnippet.length > 150 ? '...' : ''}</code>
        </pre>
      </div>
    </div>
  );
};

const RAGInspector = ({ chunks }: { chunks: RAGChunk[] }) => {
  return (
    <div className="w-[300px] flex-shrink-0 h-full bg-vault-panel border-l border-vault-border flex flex-col relative z-10 shadow-[-5px_0_15px_rgba(0,0,0,0.15)] print:hidden">
      
      <div className="p-4 border-b border-vault-border">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-vault-textBody tracking-widest uppercase">RAG Context Inspector</h3>
          <span className="bg-vault-accent/15 text-vault-accent border border-vault-accent/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider">TOP {String(chunks.length || 5).padStart(2, '0')}</span>
        </div>
        <p className="text-[10px] text-vault-textBody opacity-60 mb-3">Retrieved AST Chunks (LanceDB)</p>
        
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-vault-textBody opacity-50" />
          <input 
            type="text" 
            placeholder="Filter chunks..." 
            className="w-full bg-vault-base border border-vault-border rounded py-1.5 pl-8 pr-3 text-xs text-vault-textPrimary outline-none focus:border-vault-accent transition-colors placeholder:text-vault-textBody/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {chunks.length === 0 ? (
          <div className="p-4 text-xs text-vault-textBody opacity-60 text-center mt-10">
            No chunks retrieved yet. Select a preset to generate docs.
          </div>
        ) : (
          chunks.map((c, i) => {
            const distanceScore = Math.max(0, 1 - c.distance); // Convert distance to roughly a 0-1 similarity score
            const matchPerc = Math.round(distanceScore * 100);
            
            let matchColor: 'green' | 'cyan' | 'orange' = 'green';
            if (matchPerc < 90 && matchPerc >= 80) matchColor = 'cyan';
            if (matchPerc < 80) matchColor = 'orange';

            return (
              <RagCard 
                key={i}
                file={c.file} 
                desc={`${c.symbol} (${c.type})`}
                match={`${matchPerc}%`}
                matchColor={matchColor}
                codeSnippet={c.code}
              />
            )
          })
        )}
      </div>

      <div className="p-3 border-t border-vault-border bg-vault-panel text-center">
        <span className="text-[10px] text-vault-textBody opacity-60 tracking-wider">
          <span className="text-vault-security mr-1">●</span> lancedb • 512-dim • cosine
        </span>
      </div>
    </div>
  );
};

export default RAGInspector;
