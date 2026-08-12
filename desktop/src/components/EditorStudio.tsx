import React from 'react';
import { Download, Copy, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const EditorStudio = ({ markdown, isLoading }: { markdown: string, isLoading: boolean }) => {
  return (
    <div className="flex-1 h-full bg-[#0B121E] flex flex-col relative">
      <div className="flex-1 overflow-y-auto px-12 py-10 max-w-4xl mx-auto w-full custom-scrollbar">
        
        {!markdown && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-vault-textBody opacity-50">
             <h1 className="text-2xl font-bold mb-4">No Document Generated</h1>
             <p>Select a preset from the left to begin RAG generation.</p>
          </div>
        )}

        <div className="prose prose-invert prose-p:text-vault-textBody prose-headings:text-vault-textPrimary prose-a:text-vault-accent max-w-none prose-pre:bg-vault-panel prose-pre:border prose-pre:border-vault-border">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdown}
          </ReactMarkdown>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 mt-4 text-vault-accent opacity-80">
            <div className="w-2 h-4 bg-vault-accent animate-pulse rounded-sm"></div>
            <span className="text-sm">Generating...</span>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div className="absolute bottom-6 right-8 flex items-center gap-2">
        <button className="flex items-center gap-2 bg-vault-panel hover:bg-vault-card border border-vault-border px-3 py-2 rounded text-xs text-vault-textBody transition-colors">
          <Download className="w-3.5 h-3.5" /> Export .MD
        </button>
        <button className="flex items-center gap-2 bg-vault-panel hover:bg-vault-card border border-vault-border px-3 py-2 rounded text-xs text-vault-textBody transition-colors">
          <FileText className="w-3.5 h-3.5" /> Export .PDF
        </button>
        <button className="flex items-center gap-2 bg-vault-panel hover:bg-vault-card border border-vault-border px-3 py-2 rounded text-xs text-vault-textBody transition-colors">
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
      </div>
    </div>
  );
};

export default EditorStudio;
