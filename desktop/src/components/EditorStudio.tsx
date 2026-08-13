import { useState, useRef, useEffect } from 'react';
import { Edit3, Eye, Download, Copy, FileText, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { applyMarkdownFormatting, detectActiveFormats } from '../services/markdownEditor';

interface EditorStudioProps {
  markdown: string;
  isLoading: boolean;
  onMarkdownChange?: (newMarkdown: string) => void;
  onActiveFormatsChange?: (formats: Record<string, boolean>) => void;
}

const EditorStudio = ({ markdown, isLoading, onMarkdownChange, onActiveFormatsChange }: EditorStudioProps) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  useEffect(() => {
    const handleInsertEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: string }>;
      const action = customEvent.detail?.action;
      if (!action) return;

      // Automatically switch to edit mode when formatting toolbar is clicked
      setViewMode('edit');

      const textarea = textareaRef.current;
      let start = markdown.length;
      let end = markdown.length;

      if (textarea && document.activeElement === textarea) {
        start = textarea.selectionStart;
        end = textarea.selectionEnd;
      } else if (lastSelectionRef.current.start !== 0 || lastSelectionRef.current.end !== 0) {
        start = lastSelectionRef.current.start;
        end = lastSelectionRef.current.end;
      }

      const { newText, cursorPosition } = applyMarkdownFormatting(markdown, action, start, end);
      onMarkdownChange?.(newText);

      const detected = detectActiveFormats(newText, cursorPosition, cursorPosition);
      onActiveFormatsChange?.(detected);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
          lastSelectionRef.current = { start: cursorPosition, end: cursorPosition };
        }
      }, 50);
    };

    window.addEventListener('vaultdoc_insert_markdown', handleInsertEvent);
    return () => {
      window.removeEventListener('vaultdoc_insert_markdown', handleInsertEvent);
    };
  }, [markdown, onMarkdownChange, onActiveFormatsChange]);

  const handleSelectTextarea = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const start = e.currentTarget.selectionStart;
    const end = e.currentTarget.selectionEnd;
    lastSelectionRef.current = { start, end };
    const detected = detectActiveFormats(markdown, start, end);
    onActiveFormatsChange?.(detected);
  };

  // Dynamically extract main title from markdown (e.g. # Title) or fallback to VaultDoc standard title
  const titleMatch = markdown ? markdown.match(/^#\s+(.+)$/m) : null;
  const docTitle = titleMatch ? titleMatch[1].replace(/[*_~`]/g, '').trim() : 'Codebase Architecture Specification';

  return (
    <div className="flex-1 h-full bg-vault-base flex flex-col relative">
      {/* --- Print Only: Fixed Header (Appears on Page 2+) --- */}
      <div className="hidden print:flex fixed top-0 left-0 w-full justify-between items-center pb-2 border-b-2 border-[#0284c7] z-10 text-[10px] font-sans uppercase tracking-widest bg-white print-fixed-header">
        <div></div>
        <div className="flex items-center gap-1">
          <span className="font-bold text-[#0284c7] text-sm tracking-wide">VaultDoc</span>
        </div>
      </div>
      
      {/* --- Print Only: Cover Page (Page 1) --- */}
      <div className="hidden print:flex flex-col justify-between w-full bg-white relative z-50 print-cover-page">
        {/* Top Header Bar */}
        <div className="w-full h-12 bg-[#0284c7] flex items-center justify-end px-6 text-white text-[10px] tracking-widest uppercase font-bold">
          <span>SYSTEM ARCHITECTURE</span>
        </div>

        {/* Center Title & Hero */}
        <div className="px-6 my-auto">
          <div className="flex flex-col items-start mb-6">
            <span className="text-6xl font-extrabold text-[#0284c7] tracking-tight leading-normal">VaultDoc</span>
          </div>
          
          <div className="border-l-4 border-[#0284c7] pl-6 py-2 my-8">
            <h1 className="text-3xl font-light text-[#0284c7] tracking-tight m-0 leading-tight">{docTitle}</h1>
            <p className="text-sm text-gray-500 mt-2 font-mono">Automated Technical Specification & AST System Analysis</p>
          </div>

          <div className="inline-block bg-[#0284c7] text-white px-6 py-2 text-xs font-bold tracking-widest uppercase rounded-sm shadow-sm">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>

          {/* Metadata Block Table */}
          <div className="mt-12 border border-sky-200 rounded text-xs font-sans overflow-hidden">
            <div className="grid grid-cols-4 border-b border-sky-200 bg-sky-50 p-3 font-bold text-sky-900">
              <div>Document ID</div>
              <div className="text-sky-700 font-normal">VD-SPEC-01</div>
              <div>Generated Mode</div>
              <div className="text-sky-700 font-normal">RAG AST Pipeline</div>
            </div>
            <div className="grid grid-cols-4 p-3 text-gray-600 bg-white">
              <div className="font-bold text-sky-900">Engine</div>
              <div>LanceDB + Ollama</div>
              <div className="font-bold text-sky-900">Access Level</div>
              <div>Public / Architecture</div>
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer Footer */}
        <div className="w-full pt-3 pb-2 border-t-2 border-[#0284c7] mt-8">
          <p className="text-[9px] text-gray-500 m-0 leading-relaxed font-sans">
            This document was automatically generated by VaultDoc AI Knowledge System. All technical specifications and repository AST data contained herein are verified against active workspace components.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[40px] py-[48px] max-w-[840px] mx-auto w-full custom-scrollbar markdown-container">
        
        {!markdown && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-vault-textBody opacity-60">
             <h1 className="text-2xl font-bold mb-4 text-vault-textPrimary">No Document Generated</h1>
             <p className="text-sm">Select a preset from the left to begin RAG generation or click formatting buttons above.</p>
          </div>
        )}

        {viewMode === 'edit' ? (
          <div className="w-full h-full flex flex-col min-h-[500px]">
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => onMarkdownChange?.(e.target.value)}
              onSelect={handleSelectTextarea}
              onClick={handleSelectTextarea}
              onKeyUp={handleSelectTextarea}
              placeholder="Type markdown content here or use the toolbar buttons..."
              className="w-full h-full min-h-[500px] bg-vault-card border border-vault-border rounded-lg p-6 font-mono text-sm text-vault-textPrimary outline-none focus:border-vault-accent transition-colors custom-scrollbar resize-none leading-relaxed"
            />
          </div>
        ) : (
          <div className="markdown-body prose max-w-none text-[15px] leading-[1.8] text-vault-textBody tracking-wide
                          prose-p:mb-[20px] prose-p:text-vault-textBody prose-p:leading-[1.8]
                          prose-h1:text-[28px] prose-h1:font-[700] prose-h1:text-vault-textPrimary prose-h1:mb-[24px] prose-h1:mt-[40px] prose-h1:border-b prose-h1:border-vault-border prose-h1:pb-4
                          prose-h2:text-[20px] prose-h2:font-[600] prose-h2:text-vault-textPrimary prose-h2:mb-[20px] prose-h2:mt-[48px] prose-h2:border-b prose-h2:border-vault-border prose-h2:pb-3
                          prose-h3:text-[16px] prose-h3:font-[600] prose-h3:text-vault-textPrimary prose-h3:mb-[12px] prose-h3:mt-[32px]
                          prose-li:mb-[12px] prose-li:leading-[1.6] prose-li:text-vault-textBody
                          prose-a:text-vault-accent">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && !className?.includes('language-');
                  
                  if (isInline) {
                    return (
                      <code className="inline-block text-[13px] px-[8px] py-[2px] mx-[2px] bg-vault-accent/10 text-vault-accent rounded font-mono before:content-none after:content-none" {...props}>
                        {children}
                      </code>
                    );
                  }
                  
                  const lang = match ? match[1] : 'text';
                  const codeStr = String(children).replace(/\n$/, '');
                  
                  // Super fast regex syntax highlighting for keywords, strings, and types (with html leak fix)
                  let highlightedCode = codeStr
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') // Escape HTML first
                    .replace(/(["'`])(.*?)\1/g, '___STR_START___$1$2$1___STR_END___')
                    .replace(/\b(const|let|var|function|return|export|import|from|class|if|else|for|while|await|async|type|interface|public|private)\b/g, '___KW_START___$1___KW_END___')
                    .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '___TYP_START___$1___TYP_END___')
                    .replace(/___STR_START___/g, '<span style="color: #98C379">')
                    .replace(/___STR_END___/g, '</span>')
                    .replace(/___KW_START___/g, '<span style="color: #C678DD">')
                    .replace(/___KW_END___/g, '</span>')
                    .replace(/___TYP_START___/g, '<span style="color: #56B6C2">')
                    .replace(/___TYP_END___/g, '</span>');

                  return (
                    <div className="relative group my-6 border border-vault-border rounded-lg overflow-hidden bg-[#121927] code-block-wrapper">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-vault-border/50 bg-[#0d131f] code-block-header">
                        <span className="text-[10px] font-mono text-vault-textBody opacity-70 uppercase tracking-wider">{lang}</span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(codeStr)}
                          className="text-[10px] text-vault-textBody opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1 print:hidden"
                        >
                          <Copy className="w-3 h-3" /> copy
                        </button>
                      </div>
                      <div className="p-4 overflow-x-auto custom-scrollbar code-block-content">
                        <code 
                          className="text-[13px] font-mono text-vault-textPrimary leading-relaxed" 
                          dangerouslySetInnerHTML={{ __html: highlightedCode }} 
                        />
                      </div>
                    </div>
                  );
                }
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 mt-4 text-vault-accent opacity-80">
            <div className="w-2 h-4 bg-vault-accent animate-pulse rounded-sm"></div>
            <span className="text-sm">Generating...</span>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div className="absolute bottom-6 right-8 flex items-center gap-2 export-actions-bar">
        <button 
          onClick={() => setViewMode(prev => prev === 'preview' ? 'edit' : 'preview')}
          className="flex items-center gap-2 bg-vault-panel hover:bg-vault-card active:scale-95 active:bg-vault-base border border-vault-border px-3 py-2 rounded text-xs text-vault-textBody transition-all duration-150"
          title={viewMode === 'preview' ? "Switch to Raw Editor" : "Switch to Live Preview"}
        >
          {viewMode === 'preview' ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {viewMode === 'preview' ? 'Edit Source' : 'Live Preview'}
        </button>
        <button 
          onClick={() => {
            if (!markdown) return;
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'vaultdoc-export.md';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 bg-vault-panel hover:bg-vault-card active:scale-95 active:bg-vault-base border border-vault-border px-3 py-2 rounded text-xs text-vault-textBody transition-all duration-150"
        >
          <Download className="w-3.5 h-3.5" /> Export .MD
        </button>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-vault-panel hover:bg-vault-card active:scale-95 active:bg-vault-base border border-vault-border px-3 py-2 rounded text-xs text-vault-textBody transition-all duration-150"
        >
          <FileText className="w-3.5 h-3.5" /> Export .PDF
        </button>
        <button 
          onClick={() => {
            if (!markdown) return;
            navigator.clipboard.writeText(markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={`flex items-center gap-2 border border-vault-border px-3 py-2 rounded text-xs transition-all duration-150 active:scale-95 ${
            copied 
              ? 'bg-vault-security/20 text-vault-security border-vault-security/50' 
              : 'bg-vault-panel hover:bg-vault-card text-vault-textBody active:bg-vault-base'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

export default EditorStudio;
