import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { 
  Plus, 
  Minus, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  FileCode,
  Square
} from 'lucide-react';
import type { ASTSymbol } from '../services/vaultdoc';
import { generateArchitectureModel, type ArchitectureViewMode, type ArchitectureNode } from '../services/architecture';

interface ArchitectureStudioProps {
  symbols: ASTSymbol[];
  activeView: ArchitectureViewMode;
  onViewChange: (view: ArchitectureViewMode) => void;
  onSelectNodeCitation?: (node: ArchitectureNode | { file: string; symbol: string }) => void;
}

export const ArchitectureStudio = ({
  symbols,
  activeView,
  onViewChange,
  onSelectNodeCitation
}: ArchitectureStudioProps) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);

  const model = generateArchitectureModel(symbols);

  const currentDiagram = 
    activeView === 'system' 
      ? model.systemDiagram 
      : activeView === 'architecture' 
        ? model.archDiagram 
        : model.flowDiagram;

  // Initialize Mermaid with custom dark cyber theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#0B0C10',
        primaryColor: '#0c4a6e',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#0284c7',
        lineColor: '#38bdf8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '13px'
      },
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);

  // Render diagram to SVG
  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!currentDiagram || currentDiagram.trim() === '') {
        setSvgContent('');
        return;
      }
      try {
        setRenderError(null);
        const uniqueId = `mermaid-svg-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, currentDiagram);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setRenderError(err.message || 'Failed to render architecture diagram');
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [currentDiagram, activeView]);

  // Handle Pan & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(Math.max(0.3, prev * zoomFactor), 3.0));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(currentDiagram);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultdoc-${activeView}-diagram.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleNodeClick = (node: ArchitectureNode) => {
    setSelectedNode(node);
    if (onSelectNodeCitation) {
      onSelectNodeCitation({
        file: node.filePath || 'desktop/src/App.tsx',
        symbol: node.symbol || node.label
      });
    }
  };

  return (
    <div className="flex-1 h-full bg-[#131316] flex flex-col relative overflow-hidden select-none font-sans">
      
      {/* 1. Flush Edge-to-Edge Sub-Header */}
      <div className="h-11 px-6 border-b border-white/[0.04] bg-[#131316] flex items-center justify-between flex-shrink-0 z-20 print:hidden">
        
        {/* Left View Switcher Segmented Glass Tab */}
        <div className="bg-white/5 border border-white/10 p-0.5 rounded-xl text-xs flex gap-0.5">
          <button
            onClick={() => onViewChange('system')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeView === 'system'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            System Design
          </button>
          <button
            onClick={() => onViewChange('architecture')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeView === 'architecture'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Architecture Map
          </button>
          <button
            onClick={() => onViewChange('flow')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeView === 'flow'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Component Flow
          </button>
        </div>

        {/* Right Floating Export Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSvg}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            title="Download vector SVG file"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export SVG</span>
          </button>
          <button
            onClick={handleCopyMermaid}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            title="Copy raw Mermaid markup"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
            <span>{copied ? 'Copied' : 'Copy Mermaid'}</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            title="Export architecture report as PDF"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Diagram Canvas View */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center relative overflow-hidden bg-[#131316] bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]"
      >
        {/* Floating Top Right Legend (Matte Slate Card) */}
        <div className="absolute top-5 right-5 z-20 bg-[#16171B] border border-white/10 rounded-xl px-3.5 py-2.5 shadow-xl flex flex-col gap-2 pointer-events-none print:hidden">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Client / Core</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Data / Auth</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Workers</span>
          </div>
        </div>

        {/* Floating Bottom Right Vertical Zoom Bar */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col items-center bg-[#16171B] border border-white/10 rounded-xl p-1 shadow-xl gap-1 print:hidden">
          <button
            onClick={() => setZoom(z => Math.min(3.0, z + 0.15))}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-4 h-[1px] bg-white/10" />
          <button
            onClick={() => setZoom(z => Math.max(0.3, z - 0.15))}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="w-4 h-[1px] bg-white/10" />
          <button
            onClick={handleResetView}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Reset Zoom & Position"
          >
            <Square className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>

        {/* Diagram SVG Output */}
        {symbols.length === 0 ? (
          <div className="p-8 max-w-md bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl text-center shadow-2xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
              <Layers className="w-6 h-6 text-sky-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">No Codebase Repository Selected</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Select a project from the left sidebar to parse live AST syntax and render its system architecture, components, and data flow.
            </p>
          </div>
        ) : renderError ? (
          <div className="p-6 bg-red-950/40 border border-red-500/30 rounded-2xl text-center max-w-md">
            <h4 className="text-sm font-semibold text-red-300 mb-2">Diagram Rendering Error</h4>
            <p className="text-xs text-red-200 font-mono mb-4">{renderError}</p>
            <button
              onClick={() => onViewChange('system')}
              className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-medium cursor-pointer"
            >
              Reset to System View
            </button>
          </div>
        ) : (
          <div
            ref={svgWrapperRef}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.08s ease-out'
            }}
            className="p-8 select-none pointer-events-auto transition-transform flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      {/* 3. Flush Bottom AST Node Citations Drawer / Inspector Shelf */}
      <div className="border-t border-white/[0.04] bg-[#131316] px-6 py-3 z-10 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">
              Interactive Component Graph & Citations
            </span>
            <span className="text-[10px] text-slate-500">
              (Click any node to link with RAG Context Inspector)
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-300 bg-white/[0.04] px-2.5 py-0.5 rounded-lg border border-white/10">
            {model.nodes.length} Ingested Components
          </span>
        </div>

        {/* Node citation pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {model.nodes.length === 0 ? (
            <div className="py-1 px-2 text-xs text-slate-500 font-mono">
              No components loaded. Select a repository to populate live AST graph nodes.
            </div>
          ) : (
            model.nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 border-white/20 text-white shadow-sm font-medium'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="p-1 rounded-lg bg-black/40 border border-white/10">
                    {node.type === 'database' ? (
                      <Cpu className="w-3 h-3 text-emerald-400" />
                    ) : node.type === 'security' ? (
                      <ShieldCheck className="w-3 h-3 text-purple-400" />
                    ) : (
                      <FileCode className="w-3 h-3 text-sky-400" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium leading-tight truncate max-w-[140px]">
                      {node.label}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 truncate max-w-[140px]">
                      {node.filePath ? node.filePath.split('/').pop() : 'AST Node'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchitectureStudio;
