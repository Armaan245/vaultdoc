import { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  Plus, 
  Hexagon, 
  TriangleAlert, 
  Minus,
  X,
  Sparkles
} from 'lucide-react';
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

const TreeFolder = ({ node, indent = 0 }: { node: TreeNode; indent?: number }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  const children = Object.values(node.children).sort((a, b) => {
    if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
    return a.isFolder ? -1 : 1;
  });

  return (
    <div>
      <div 
        className="flex items-center py-1.5 px-3 cursor-pointer hover:bg-vault-base text-slate-300 transition-colors select-none text-xs"
        style={{ paddingLeft: `${indent * 12 + 12}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 mr-1 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 opacity-60" />}
        <Folder className="w-3.5 h-3.5 mr-2 text-cyan-400 opacity-80 flex-shrink-0" fill="currentColor" />
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen && children.map(child => child.isFolder ? (
        <TreeFolder key={child.path} node={child} indent={indent + 1} />
      ) : (
        <TreeFile key={child.path} node={child} indent={indent + 1} />
      ))}
    </div>
  );
};

const TreeFile = ({ node, indent = 0 }: { node: TreeNode; indent?: number }) => {
  const ext = node.name.split('.').pop() || '';
  let color = 'text-slate-400';
  const codeExts = ['ts', 'tsx', 'js', 'jsx', 'go', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'swift', 'kt'];
  const dataExts = ['py', 'json', 'rs', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'scss', 'mjs', 'sql'];
  const docExts = ['md', 'mdx', 'txt', 'csv'];

  if (codeExts.includes(ext)) color = 'text-cyan-400';
  if (dataExts.includes(ext)) color = 'text-amber-400';
  if (docExts.includes(ext)) color = 'text-emerald-400';
  
  return (
    <div 
      className="flex items-center py-1 px-3 cursor-pointer hover:bg-vault-base text-slate-300 transition-colors group text-xs"
      style={{ paddingLeft: `${indent * 12 + 28}px` }}
    >
      <span className={`text-[9px] w-6 mr-1 font-mono uppercase font-bold opacity-80 group-hover:opacity-100 ${color}`}>
        {ext.substring(0, 3)}
      </span>
      <span className="truncate text-slate-300 group-hover:text-white">{node.name}</span>
    </div>
  );
};

interface LeftSidebarProps {
  fileTree: Set<string>;
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  onClose: () => void;
}

export const LeftSidebar = ({ fileTree, onGenerate, isLoading, onClose }: LeftSidebarProps) => {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const files = Array.from(fileTree);
  const hasRepo = files.length > 0;
  
  const rootNode = useMemo(() => buildTree(files), [files]);
  
  const topLevelChildren = Object.values(rootNode.children).sort((a, b) => {
    if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
    return a.isFolder ? -1 : 1;
  });

  return (
    <div className="w-[250px] flex-shrink-0 h-full bg-[#080d1a] border-r border-vault-border flex flex-col justify-between select-none print:hidden z-10 shadow-lg animate-fadeIn">
      {/* Top Header */}
      <div className="flex-1 overflow-y-auto pt-3 pb-3 custom-scrollbar">
        <div className="flex items-center justify-between px-3.5 mb-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
          <span>Repository Explorer</span>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-vault-panel rounded text-slate-400 hover:text-white"
            title="Collapse Drawer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="flex flex-col">
          {files.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              No repository loaded.<br />Click the top folder button to load workspace.
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

      {/* Generator Presets Section */}
      <div className="pt-3 pb-4 bg-[#060a14] border-t border-vault-border">
        <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 tracking-widest uppercase opacity-80 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Generator Presets</span>
        </div>
        
        <div onClick={() => !isLoading && hasRepo && onGenerate('Generate a comprehensive Architecture Specification covering all major modules. Format all database schemas strictly as Markdown Tables.')}>
          <PresetCard title="Architecture Spec" Icon={Hexagon} disabled={!hasRepo} />
        </div>
        <div onClick={() => !isLoading && hasRepo && onGenerate('Generate API Reference documentation covering all public routes, request payloads, and response interfaces.')}>
          <PresetCard title="API Reference" Icon={Minus} disabled={!hasRepo} />
        </div>
        <div onClick={() => !isLoading && hasRepo && onGenerate('Perform an offline Security Audit on the codebase and document all potential vulnerabilities and edge cases.')}>
          <PresetCard title="Security Audit" Icon={TriangleAlert} disabled={!hasRepo} />
        </div>

        <div className="px-3 mt-3">
          <button 
            disabled={isLoading || !hasRepo}
            onClick={() => setIsCustomModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500 hover:text-black rounded-lg transition-all text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Generating...' : 'Custom Document'}</span>
          </button>
        </div>
      </div>

      {isCustomModalOpen && <CustomDocumentModal onClose={() => setIsCustomModalOpen(false)} onGenerate={onGenerate} />}
    </div>
  );
};

const PresetCard = ({ title, disabled = false, Icon }: { title: string; disabled?: boolean; Icon: React.ElementType }) => (
  <div className={`flex items-center gap-2 px-2.5 py-1.5 mx-2.5 mb-1.5 rounded-lg border transition-all select-none ${
    disabled 
      ? 'opacity-40 cursor-not-allowed border-vault-border/50 text-slate-500' 
      : 'border-vault-border/80 bg-vault-card/40 hover:bg-vault-card hover:border-cyan-500/40 text-slate-300 hover:text-white cursor-pointer'
  }`}>
    <Icon className="w-3.5 h-3.5 text-cyan-400" />
    <span className="text-xs font-medium">{title}</span>
  </div>
);

export default LeftSidebar;
