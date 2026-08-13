import { useState } from 'react';
import { X, Sparkles, FileText, Layout, Database } from 'lucide-react';

interface CustomDocumentModalProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

const PRESETS = [
  { label: 'Deployment Guide', prompt: 'Create a comprehensive deployment guide and environment variable breakdown.', icon: <Layout className="w-3.5 h-3.5" /> },
  { label: 'Database Schema', prompt: 'Generate a complete overview of the database schema, detailing all tables and relationships.', icon: <Database className="w-3.5 h-3.5" /> },
  { label: 'Refactoring Checklist', prompt: 'Analyze the codebase and provide a refactoring checklist to improve maintainability and performance.', icon: <FileText className="w-3.5 h-3.5" /> }
];

export default function CustomDocumentModal({ onClose, onGenerate }: CustomDocumentModalProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt.trim()) {
      onGenerate(prompt.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden">
      <div className="bg-vault-panel border border-vault-border w-full max-w-lg rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-vault-border bg-vault-base">
          <div className="flex items-center gap-2 text-vault-textPrimary font-semibold">
            <Sparkles className="w-4 h-4 text-vault-accent" />
            <span>Generate Custom Document</span>
          </div>
          <button onClick={onClose} className="text-vault-textBody hover:text-vault-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-1.5 block opacity-80">
              Document Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the document you want to generate (e.g., 'Create a comprehensive deployment guide and environment variable breakdown')..."
              className="w-full h-32 bg-vault-base border border-vault-border rounded p-3 text-sm text-vault-textPrimary focus:outline-none focus:border-vault-accent resize-none custom-scrollbar"
              autoFocus
            />
          </div>

          <div>
            <div className="text-[10px] font-semibold text-vault-textBody tracking-widest uppercase mb-2 opacity-80">
              Quick Presets
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(p.prompt)}
                  className="flex items-center gap-1.5 bg-vault-base border border-vault-border hover:border-vault-accent hover:text-vault-accent text-vault-textBody px-2.5 py-1.5 rounded text-xs transition-colors"
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-vault-border bg-vault-base">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-vault-textBody hover:text-vault-textPrimary transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className="px-4 py-2 text-sm font-medium bg-vault-accent text-vault-base rounded hover:opacity-90 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Generate Document
          </button>
        </div>
      </div>
    </div>
  );
}
