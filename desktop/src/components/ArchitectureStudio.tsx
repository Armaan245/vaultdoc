import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Plus, 
  Minus, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  Cpu, 
  FileCode,
  Square,
  Sparkles,
  X,
  ArrowRight,
  ArrowDownRight,
  ShieldCheck,
  AlertTriangle,
  Info,
  Database,
  Globe,
  DoorOpen,
  Eye,
  FileText,
  Workflow
} from 'lucide-react';
import type { ASTSymbol } from '../services/vaultdoc';
import { 
  generateArchitectureModel, 
  type ArchitectureViewMode, 
  type ArchitectureNode,
  type ArchitectureLayerId,
  type PrimerPatternCheck
} from '../services/architecture';

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
  const [copiedMermaid, setCopiedMermaid] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);
  const [isInspectionDrawerOpen, setIsInspectionDrawerOpen] = useState(false);
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [briefTab, setBriefTab] = useState<'preview' | 'raw'>('preview');
  const [activeTierFilter, setActiveTierFilter] = useState<ArchitectureLayerId | 'all'>('all');
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

  // Initialize Mermaid with clean dark theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#131316',
        primaryColor: '#1e293b',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#334155',
        lineColor: '#64748b',
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

  // Set default selected node when model loads if none is selected
  useEffect(() => {
    if (model.nodes.length > 0 && !selectedNode) {
      setSelectedNode(model.nodes[0]);
    }
  }, [model.nodes, selectedNode]);

  // Attach interactive click listeners to Mermaid SVG nodes
  useEffect(() => {
    if (!svgWrapperRef.current || !svgContent) return;

    const cards = svgWrapperRef.current.querySelectorAll('.arch-card');
    cards.forEach((card) => {
      const cardEl = card as HTMLElement;
      cardEl.style.cursor = 'pointer';
      
      const clickHandler = (e: Event) => {
        e.stopPropagation();
        const nodeId = cardEl.getAttribute('data-node-id');
        const titleEl = cardEl.querySelector('.arch-title');
        const titleText = titleEl?.textContent?.trim() || '';

        let matchedNode: ArchitectureNode | undefined;
        if (nodeId) {
          matchedNode = model.nodes.find(n => n.id === nodeId);
        }
        if (!matchedNode && titleText) {
          matchedNode = model.nodes.find(n => 
            n.label.toLowerCase() === titleText.toLowerCase() ||
            titleText.toLowerCase().includes(n.label.toLowerCase())
          );
        }

        if (matchedNode) {
          handleSelectNode(matchedNode);
        }
      };

      cardEl.addEventListener('click', clickHandler);
    });
  }, [svgContent, model.nodes]);

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
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  const handleCopyBrief = () => {
    navigator.clipboard.writeText(model.briefMarkdown);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  const handleDownloadBrief = () => {
    const blob = new Blob([model.briefMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-design-primer-brief.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const handleSelectNode = (node: ArchitectureNode) => {
    setSelectedNode(node);
    setIsInspectionDrawerOpen(true);
    if (onSelectNodeCitation) {
      onSelectNodeCitation({
        file: node.filePath || 'desktop/src/App.tsx',
        symbol: node.symbol || node.label
      });
    }
  };

  const getLayerIcon = (layerId: ArchitectureLayerId, className = "w-3.5 h-3.5") => {
    switch (layerId) {
      case 'ingress':
        return <DoorOpen className={`${className} text-slate-300`} />;
      case 'domain':
        return <Cpu className={`${className} text-slate-300`} />;
      case 'persistence':
        return <Database className={`${className} text-slate-300`} />;
      case 'egress':
        return <Globe className={`${className} text-slate-300`} />;
    }
  };

  const getStatusBadge = (status: PrimerPatternCheck['status']) => {
    switch (status) {
      case 'pass':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Pass
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded-md">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Warning
          </span>
        );
      case 'info':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
            <Info className="w-3 h-3 text-slate-400" />
            Info
          </span>
        );
    }
  };

  const filteredShelfNodes = model.nodes.filter(n => {
    if (activeTierFilter === 'all') return true;
    return n.layer === activeTierFilter;
  });

  return (
    <div className="flex-1 h-full bg-[#131316] flex flex-col relative overflow-hidden select-none font-sans">
      
      {/* 1. Flush Edge-to-Edge Sub-Header */}
      <div className="h-11 px-6 border-b border-white/[0.04] bg-[#131316] flex items-center justify-between flex-shrink-0 z-20 print:hidden gap-3">
        
        {/* Left View Switcher Segmented Glass Tab */}
        <div className="flex items-center gap-3">
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

          {/* Quick Metrics Badges */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg font-mono">
              {model.nodes.length} AST Nodes
            </span>
            {model.bottlenecksCount > 0 ? (
              <span className="bg-white/5 border border-white/5 text-slate-300 px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                {model.bottlenecksCount} Bottlenecks
              </span>
            ) : (
              <span className="bg-white/5 border border-white/5 text-slate-300 px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Primer Verified
              </span>
            )}
          </div>
        </div>

        {/* Right Clean Action Buttons */}
        <div className="flex items-center gap-2">
          
          {/* PRIMARY BUTTON: Clean White Matte Action Button */}
          <button
            onClick={() => setIsBriefModalOpen(true)}
            className="flex items-center gap-1.5 font-medium text-xs px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Generate standard System Design Primer architecture report"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>Generate Architecture Brief</span>
          </button>

          <button
            onClick={handleExportSvg}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            title="Download vector SVG file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export SVG</span>
          </button>

          <button
            onClick={handleCopyMermaid}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            title="Copy raw Mermaid markup"
          >
            {copiedMermaid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{copiedMermaid ? 'Copied' : 'Mermaid'}</span>
          </button>
        </div>
      </div>

      {/* Main Diagram Canvas View & Inspection Slide-Out Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Diagram Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="flex-1 h-full cursor-grab active:cursor-grabbing flex items-center justify-center relative overflow-hidden bg-[#131316] bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]"
        >
          {/* Floating Top Right Legend (Matte Slate Card) */}
          <div className="absolute top-4 right-4 z-10 bg-[#16171B] border border-white/10 rounded-xl px-3.5 py-2.5 shadow-xl flex flex-col gap-2 pointer-events-none print:hidden">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              System Design Tiers
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
              <div className="w-2 h-2 rounded-full bg-sky-400" />
              <span>L1: Ingress & Gateways</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>L2: Domain & Business</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>L3: Data Persistence</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>L4: External Egress</span>
            </div>
          </div>

          {/* Floating Bottom Right Vertical Zoom Bar */}
          <div className="absolute bottom-5 right-5 z-10 flex flex-col items-center bg-[#16171B] border border-white/10 rounded-xl p-1 shadow-xl gap-1 print:hidden">
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
                <Layers className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">No Codebase Repository Selected</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select a project from the left sidebar to parse live AST syntax and map its components into the 4 System Design Primer architectural tiers.
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

        {/* 2. ARCHITECTURE NODE INSPECTION DRAWER (Slide-out panel) */}
        {isInspectionDrawerOpen && selectedNode && (
          <div className="w-96 border-l border-white/[0.06] bg-[#16171B] flex flex-col h-full z-30 shadow-2xl flex-shrink-0 animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  {getLayerIcon(selectedNode.layer, "w-4 h-4")}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-white truncate leading-tight">
                    {selectedNode.label}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-slate-300">
                      {selectedNode.layer.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      {selectedNode.filePath}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsInspectionDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close Inspector Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
              
              {/* SECTION A: Component Role */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Component Role</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 leading-relaxed">
                  {selectedNode.role}
                </div>
              </div>

              {/* SECTION B: Public Interface & AST Symbols */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    <FileCode className="w-3.5 h-3.5 text-slate-400" />
                    <span>Public Interface & Symbols</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {selectedNode.symbolsList.length} Symbols
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {selectedNode.symbolsList.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-slate-500">
                      No exported methods detected.
                    </div>
                  ) : (
                    selectedNode.symbolsList.map((sym, idx) => (
                      <div 
                        key={idx}
                        className="p-2 rounded-lg bg-black/30 border border-white/5 font-mono text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-slate-200 font-semibold truncate">
                            {sym.name}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                            {sym.kind}
                          </span>
                        </div>
                        {sym.signature && (
                          <div className="text-[10px] text-slate-400 truncate text-xs" title={sym.signature}>
                            {sym.signature}
                          </div>
                        )}
                        {sym.params && sym.params.length > 0 && (
                          <div className="text-[9px] text-slate-500 truncate">
                            params: {sym.params.join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SECTION C: Upstream & Downstream Flow */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  <Workflow className="w-3.5 h-3.5 text-slate-400" />
                  <span>Upstream & Downstream Flow</span>
                </div>

                <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  {/* Upstream Callers */}
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3 text-slate-400" />
                      <span>Inbound Callers (Upstream):</span>
                    </div>
                    {selectedNode.upstreamCallers.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic pl-4">
                        Root ingress boundary (called directly by client traffic)
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 pl-4">
                        {selectedNode.upstreamCallers.map((up, idx) => {
                          const upNode = model.nodes.find(n => n.filePath === up);
                          return (
                            <button
                              key={idx}
                              onClick={() => upNode && handleSelectNode(upNode)}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                            >
                              {up.split(/[/\\]/).pop()}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/5 my-1.5" />

                  {/* Downstream Dependencies */}
                  <div>
                    <div className="text-[10px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>Dependencies (Downstream):</span>
                    </div>
                    {selectedNode.downstreamDependencies.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic pl-4">
                        Leaf terminal component (zero external codebase imports)
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 pl-4">
                        {selectedNode.downstreamDependencies.map((down, idx) => {
                          const downNode = model.nodes.find(n => n.filePath === down);
                          return (
                            <button
                              key={idx}
                              onClick={() => downNode && handleSelectNode(downNode)}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                            >
                              {down.split(/[/\\]/).pop()}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION D: System Design Primer Pattern Evaluation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Primer Pattern Evaluation</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    4 Core Rules
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedNode.primerChecks.map((check) => (
                    <div 
                      key={check.id}
                      className="p-3 rounded-xl border bg-white/[0.02] border-white/5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white">
                          {check.category}
                        </span>
                        {getStatusBadge(check.status)}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {check.summary}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {check.details}
                      </p>
                      {check.recommendation && (
                        <div className="mt-1.5 p-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300">
                          <span className="font-semibold text-white">Primer Recommendation: </span>
                          {check.recommendation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3 border-t border-white/[0.06] bg-black/30 flex items-center justify-between">
              <button
                onClick={() => {
                  if (onSelectNodeCitation) {
                    onSelectNodeCitation({
                      file: selectedNode.filePath,
                      symbol: selectedNode.symbol
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open in AST Inspector</span>
              </button>

              <button
                onClick={() => setIsBriefModalOpen(true)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                <span>View Full Brief</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 3. Flush Bottom AST Node Shelf / Tier Filter Bar */}
      <div className="border-t border-white/[0.04] bg-[#131316] px-6 py-2.5 z-10 print:hidden flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">
              Architectural Layer Catalog
            </span>
            <span className="text-[10px] text-slate-500">
              (Click any component to inspect interface & Primer checks)
            </span>
          </div>

          {/* Clean Segmented Tier Filter Tabs */}
          <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setActiveTierFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTierFilter === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({model.nodes.length})
            </button>
            <button
              onClick={() => setActiveTierFilter('ingress')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTierFilter === 'ingress' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <DoorOpen className="w-3 h-3" />
              L1 Ingress ({model.layerBreakdown.ingress.length})
            </button>
            <button
              onClick={() => setActiveTierFilter('domain')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTierFilter === 'domain' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3 h-3" />
              L2 Domain ({model.layerBreakdown.domain.length})
            </button>
            <button
              onClick={() => setActiveTierFilter('persistence')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTierFilter === 'persistence' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3 h-3" />
              L3 Data ({model.layerBreakdown.persistence.length})
            </button>
            <button
              onClick={() => setActiveTierFilter('egress')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTierFilter === 'egress' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              L4 Egress ({model.layerBreakdown.egress.length})
            </button>
          </div>
        </div>

        {/* Node citation pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {filteredShelfNodes.length === 0 ? (
            <div className="py-1 px-2 text-xs text-slate-500 font-mono">
              No components matching the selected tier filter.
            </div>
          ) : (
            filteredShelfNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;

              return (
                <button
                  key={node.id}
                  onClick={() => handleSelectNode(node)}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 border-white/20 text-white shadow-sm font-medium'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="p-1 rounded-lg bg-black/40 border border-white/10">
                    {getLayerIcon(node.layer, "w-3 h-3")}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-medium leading-tight truncate max-w-[130px]">
                      {node.label}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 truncate max-w-[130px]">
                      {node.filePath ? node.filePath.split(/[/\\]/).pop() : 'AST Node'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 4. PRIMER-STRUCTURED BRIEF GENERATOR MODAL */}
      {isBriefModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-[#16171B] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-slate-200" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    System Design Primer Architecture Brief
                  </h3>
                  <p className="text-xs text-slate-400">
                    Standard 4-section high-scale design brief generated from AST symbols
                  </p>
                </div>
              </div>

              {/* Actions & Close */}
              <div className="flex items-center gap-2">
                {/* Tabs */}
                <div className="bg-white/5 border border-white/10 p-0.5 rounded-lg text-xs flex gap-0.5 mr-2">
                  <button
                    onClick={() => setBriefTab('preview')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                      briefTab === 'preview' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3 h-3 inline mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={() => setBriefTab('raw')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                      briefTab === 'raw' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileCode className="w-3 h-3 inline mr-1" />
                    Markdown
                  </button>
                </div>

                <button
                  onClick={handleCopyBrief}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 transition-all cursor-pointer"
                >
                  {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedBrief ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownloadBrief}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download .md</span>
                </button>

                <button
                  onClick={() => setIsBriefModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#131316]">
              {briefTab === 'preview' ? (
                <div className="prose prose-invert prose-sm max-w-none space-y-4 text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {model.briefMarkdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="font-mono text-xs text-slate-300 bg-black/50 p-4 rounded-xl border border-white/5 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">
                  {model.briefMarkdown}
                </pre>
              )}
            </div>

            {/* Modal Footer Scorecard */}
            <div className="px-6 py-3 border-t border-white/[0.08] bg-black/40 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span><strong className="text-white">4</strong> Architectural Tiers</span>
                <span><strong className="text-white">{model.nodes.length}</strong> Modules Analyzed</span>
                <span><strong className="text-white">{model.bottlenecksCount}</strong> Scalability Flags</span>
              </div>
              <button
                onClick={() => setIsBriefModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs cursor-pointer transition-colors"
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

export default ArchitectureStudio;
