import React from 'react';
import { ChevronLeft, Folder, Plus, Hexagon, TriangleAlert, Minus } from 'lucide-react';

const FileItem = ({ 
  name, 
  ext, 
  extColor, 
  isActive = false, 
  isFolder = false, 
  indent = 0 
}: { 
  name: string, 
  ext?: string, 
  extColor?: string, 
  isActive?: boolean, 
  isFolder?: boolean, 
  indent?: number 
}) => {
  return (
    <div 
      className={`flex items-center py-1.5 px-3 cursor-pointer text-sm ${isActive ? 'bg-vault-card border-l-2 border-vault-accent text-vault-textPrimary' : 'border-l-2 border-transparent hover:bg-vault-base text-vault-textBody'} transition-colors`}
      style={{ paddingLeft: `${indent * 12 + 12}px` }}
    >
      {isFolder ? (
        <Folder className="w-3.5 h-3.5 mr-2 opacity-60" fill="currentColor" />
      ) : (
        <span className={`text-xs mr-2 font-mono ${extColor || 'text-vault-textBody'}`}>.{ext}</span>
      )}
      <span className={isActive ? 'font-medium' : 'truncate'}>{name}</span>
    </div>
  );
};

const LeftSidebar = ({ fileTree, onSelectRepo, onGenerate, isLoading }: { fileTree: Set<string>, onSelectRepo: () => void, onGenerate: (prompt: string) => void, isLoading: boolean }) => {
  const files = Array.from(fileTree);
  
  // Basic rendering of files (flat structure for now, but simulating folder look)
  // In a real app we'd build a nested tree, but for this demo we'll just show the flat files
  
  return (
    <div className="w-[240px] flex-shrink-0 h-full bg-vault-panel border-r border-vault-border flex flex-col justify-between">
      {/* Top Half: File Explorer */}
      <div className="flex-1 overflow-y-auto pt-4 custom-scrollbar">
        <div className="flex items-center justify-between px-4 mb-4 text-xs font-semibold text-vault-textBody tracking-widest uppercase">
          <span>Repository</span>
          <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-vault-textPrimary" onClick={onSelectRepo} />
        </div>
        
        <div className="flex flex-col">
          {files.length === 0 ? (
            <div className="px-4 text-xs text-vault-textBody opacity-60">
              No files parsed. Click the top-right button to select a repo.
            </div>
          ) : (
            files.map((file, i) => {
              const parts = file.split(/[/\\]/);
              const name = parts.pop() || file;
              const ext = name.split('.').pop() || '';
              
              let color = 'text-vault-textBody';
              if (ext === 'ts' || ext === 'tsx' || ext === 'go') color = 'text-vault-codeHighlight';
              if (ext === 'py' || ext === 'json' || ext === 'rs') color = 'text-vault-yellow';
              
              return (
                <FileItem key={i} name={name} ext={ext} extColor={color} indent={1} />
              )
            })
          )}
        </div>
      </div>

      {/* Bottom Half: Presets */}
      <div className="pt-4 pb-6 bg-vault-panel border-t border-vault-border">
        <div className="px-4 mb-4 text-[10px] font-semibold text-vault-textBody tracking-widest uppercase opacity-70">
          Generator Presets
        </div>
        
        <div onClick={() => !isLoading && onGenerate('Generate a comprehensive Architecture Specification covering all major modules.')}>
          <PresetCard title="Architecture Spec" Icon={Hexagon} isActive={false} />
        </div>
        <div onClick={() => !isLoading && onGenerate('Generate API Reference documentation.')}>
          <PresetCard title="API Reference" Icon={Minus} />
        </div>
        <div onClick={() => !isLoading && onGenerate('Perform a Security Audit and document findings.')}>
          <PresetCard title="Security Audit" Icon={TriangleAlert} />
        </div>

        <div className="px-3 mt-4">
          <button 
            disabled={isLoading}
            onClick={() => {
               const p = prompt("Enter custom prompt:");
               if (p) onGenerate(p);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 border border-vault-accent text-vault-accent hover:bg-vault-accent hover:bg-opacity-10 rounded transition-colors text-xs font-medium disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" /> {isLoading ? 'Generating...' : 'Custom Document'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PresetCard = ({ title, isActive = false, Icon }: { title: string, isActive?: boolean, Icon: React.ElementType }) => (
  <div className={`flex items-center gap-2 px-3 py-2.5 mx-3 mb-2 rounded border cursor-pointer transition-all ${
    isActive 
      ? 'bg-vault-card border-vault-accent shadow-[0_0_10px_rgba(6,182,212,0.15)] text-vault-accent' 
      : 'border-vault-border hover:border-vault-textBody opacity-60 text-vault-textBody hover:opacity-100'
  }`}>
    <Icon className="w-4 h-4" />
    <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{title}</span>
  </div>
);

export default LeftSidebar;
