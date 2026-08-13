import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Folder, Plus, Hexagon, TriangleAlert, Minus } from 'lucide-react';
import CustomDocumentModal from './CustomDocumentModal';

type TreeNode = {
  name: string;
  path: string;
  isFolder: boolean;
  children: Record<string, TreeNode>;
};

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', isFolder: true, children: {} };
  
  for (const p of paths) {
    const parts = p.split(/[/\\]/).filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isFolder: i < parts.length - 1,
          children: {}
        };
      }
      current = current.children[part];
    }
  }
  return root;
}

const TreeFolder = ({ node, indent = 0 }: { node: TreeNode, indent?: number }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const children = Object.values(node.children).sort((a, b) => {
    if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
    return a.isFolder ? -1 : 1;
  });

  return (
    <div>
      <div 
        className="flex items-center py-1.5 px-3 cursor-pointer hover:bg-vault-base text-vault-textBody transition-colors select-none"
        style={{ paddingLeft: `${indent * 12 + 12}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 mr-1 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 opacity-60" />}
        <Folder className="w-3.5 h-3.5 mr-2 text-vault-accent opacity-80 flex-shrink-0" fill="currentColor" />
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {isOpen && children.map(child => child.isFolder ? (
        <TreeFolder key={child.path} node={child} indent={indent + 1} />
      ) : (
        <TreeFile key={child.path} node={child} indent={indent + 1} />
      ))}
    </div>
  );
};

const TreeFile = ({ node, indent = 0 }: { node: TreeNode, indent?: number }) => {
  const ext = node.name.split('.').pop() || '';
  let color = 'text-vault-textBody';
  const codeExts = ['ts', 'tsx', 'js', 'jsx', 'go', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'swift', 'kt'];
  const dataExts = ['py', 'json', 'rs', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'scss', 'mjs', 'sql'];
  const docExts = ['md', 'mdx', 'txt', 'csv'];

  if (codeExts.includes(ext)) color = 'text-vault-codeHighlight';
  if (dataExts.includes(ext)) color = 'text-vault-yellow';
  if (docExts.includes(ext)) color = 'text-vault-accent';
  
  return (
    <div 
      className="flex items-center py-1.5 px-3 cursor-pointer border-l-2 border-transparent hover:bg-vault-base text-vault-textBody transition-colors group"
      style={{ paddingLeft: `${indent * 12 + 30}px` }}
    >
      <span className={`text-[10px] w-6 mr-1.5 font-mono uppercase opacity-70 group-hover:opacity-100 ${color}`}>{ext.substring(0, 3)}</span>
      <span className="text-sm truncate">{node.name}</span>
    </div>
  );
};

const LeftSidebar = ({ fileTree, onGenerate, isLoading }: { fileTree: Set<string>, onGenerate: (prompt: string) => void, isLoading: boolean }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const files = Array.from(fileTree);
  const hasRepo = files.length > 0;
  
  const rootNode = useMemo(() => buildTree(files), [files]);
  
  // Sort top-level children
  const topLevelChildren = Object.values(rootNode.children).sort((a, b) => {
    if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
    return a.isFolder ? -1 : 1;
  });

  if (isCollapsed) {
    return (
      <div className="w-[60px] flex-shrink-0 h-full bg-vault-panel border-r border-vault-border flex flex-col items-center pt-4 pb-6 justify-between print:hidden">
        <div className="flex flex-col items-center w-full">
          <ChevronRight 
            className="w-5 h-5 cursor-pointer text-vault-textBody hover:text-vault-textPrimary mb-6" 
            onClick={() => setIsCollapsed(false)} 
          />
          <div className="w-8 h-8 rounded border border-vault-border flex items-center justify-center mb-2 hover:bg-vault-base cursor-pointer" onClick={() => !isLoading && hasRepo && onGenerate('Generate a comprehensive Architecture Specification covering all major modules. Format all database schemas strictly as Markdown Tables, do NOT use SQL code blocks.')} title="Architecture Spec">
            <Hexagon className={`w-4 h-4 ${hasRepo ? 'text-vault-textBody' : 'text-vault-textBody opacity-30'}`} />
          </div>
          <div className="w-8 h-8 rounded border border-vault-border flex items-center justify-center mb-2 hover:bg-vault-base cursor-pointer" onClick={() => !isLoading && hasRepo && onGenerate('Generate API Reference documentation.')} title="API Reference">
            <Minus className={`w-4 h-4 ${hasRepo ? 'text-vault-textBody' : 'text-vault-textBody opacity-30'}`} />
          </div>
          <div className="w-8 h-8 rounded border border-vault-border flex items-center justify-center mb-2 hover:bg-vault-base cursor-pointer" onClick={() => !isLoading && hasRepo && onGenerate('Perform a Security Audit and document findings.')} title="Security Audit">
            <TriangleAlert className={`w-4 h-4 ${hasRepo ? 'text-vault-textBody' : 'text-vault-textBody opacity-30'}`} />
          </div>
        </div>
        
        <div className="w-8 h-8 rounded border border-vault-accent text-vault-accent flex items-center justify-center hover:bg-vault-accent hover:text-vault-base cursor-pointer transition-colors"
          onClick={() => {
            if (!hasRepo) return;
            setIsCustomModalOpen(true);
          }}
          title="Custom Document"
        >
          <Plus className="w-4 h-4" />
        </div>
        {isCustomModalOpen && <CustomDocumentModal onClose={() => setIsCustomModalOpen(false)} onGenerate={onGenerate} />}
      </div>
    );
  }

  return (
    <div className="w-[240px] flex-shrink-0 h-full bg-vault-panel border-r border-vault-border flex flex-col justify-between transition-all print:hidden">
      <div className="flex-1 overflow-y-auto pt-4 pb-4 custom-scrollbar">
        <div className="flex items-center justify-between px-4 mb-4 text-xs font-semibold text-vault-textBody tracking-widest uppercase">
          <span>Repository</span>
          <ChevronLeft 
            className="w-4 h-4 cursor-pointer hover:text-vault-textPrimary" 
            onClick={() => setIsCollapsed(true)}
          />
        </div>
        
        <div className="flex flex-col">
          {files.length === 0 ? (
            <div className="px-4 text-xs text-vault-textBody opacity-60">
              No files parsed. Click the top-right button to select a repo.
            </div>
          ) : (
            topLevelChildren.map(child => child.isFolder ? (
              <TreeFolder key={child.path} node={child} indent={0} />
            ) : (
              <TreeFile key={child.path} node={child} indent={0} />
            ))
          )}
        </div>
      </div>

      <div className="pt-4 pb-6 bg-vault-panel border-t border-vault-border">
        <div className="px-4 mb-4 text-[10px] font-semibold text-vault-textBody tracking-widest uppercase opacity-70">
          Generator Presets
        </div>
        
        <div onClick={() => !isLoading && hasRepo && onGenerate('Generate a comprehensive Architecture Specification covering all major modules. Format all database schemas strictly as Markdown Tables, do NOT use SQL code blocks.')}>
          <PresetCard title="Architecture Spec" Icon={Hexagon} isActive={false} disabled={!hasRepo} />
        </div>
        <div onClick={() => !isLoading && hasRepo && onGenerate('Generate API Reference documentation.')}>
          <PresetCard title="API Reference" Icon={Minus} disabled={!hasRepo} />
        </div>
        <div onClick={() => !isLoading && hasRepo && onGenerate('Perform a Security Audit and document findings.')}>
          <PresetCard title="Security Audit" Icon={TriangleAlert} disabled={!hasRepo} />
        </div>

        <div className="px-3 mt-4">
          <button 
            disabled={isLoading || !hasRepo}
            onClick={() => setIsCustomModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 border border-vault-accent text-vault-accent hover:bg-vault-accent hover:text-vault-base rounded transition-colors text-xs font-medium disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-vault-accent disabled:cursor-not-allowed">
            <Plus className="w-3.5 h-3.5" /> {isLoading ? 'Generating...' : 'Custom Document'}
          </button>
        </div>
      </div>
      {isCustomModalOpen && <CustomDocumentModal onClose={() => setIsCustomModalOpen(false)} onGenerate={onGenerate} />}
    </div>
  );
};

const PresetCard = ({ title, isActive = false, disabled = false, Icon }: { title: string, isActive?: boolean, disabled?: boolean, Icon: React.ElementType }) => (
  <div className={`flex items-center gap-2 px-3 py-2.5 mx-3 mb-2 rounded border transition-all ${
    disabled 
      ? 'opacity-50 cursor-not-allowed border-vault-border text-vault-textBody' 
      : isActive 
        ? 'bg-vault-card border-vault-accent shadow-[0_0_10px_rgba(6,182,212,0.15)] text-vault-accent cursor-pointer font-medium' 
        : 'border-vault-border hover:border-vault-textBody text-vault-textBody hover:text-vault-textPrimary cursor-pointer'
  }`}>
    <Icon className="w-4 h-4" />
    <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{title}</span>
  </div>
);

export default LeftSidebar;
