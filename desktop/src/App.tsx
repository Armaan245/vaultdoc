import { useState, useEffect } from 'react';
import Header from './components/Header';
import ActivityDock, { type ActivityTab } from './components/ActivityDock';
import LeftSidebar from './components/LeftSidebar';
import EditorStudio from './components/EditorStudio';
import ArchitectureStudio from './components/ArchitectureStudio';
import PrePRStudio from './components/PrePRStudio';
import TicketSpecStudio from './components/TicketSpecStudio';
import TestSuiteStudio from './components/TestSuiteStudio';
import GitPRStudio from './components/GitPRStudio';
import ChatStudio from './components/ChatStudio';
import RAGInspector from './components/RAGInspector';
import FooterStatusBar from './components/FooterStatusBar';
import SettingsModal from './components/SettingsModal';
import CustomDocumentModal from './components/CustomDocumentModal';
import { selectRepositoryFolder, parseRepository, generateDocumentation } from './services/vaultdoc';
import type { ASTSymbol, RAGChunk } from './services/vaultdoc';
import { getStoredTheme, applyTheme, type Theme } from './services/theme';
import { getStoredProviderConfig, isLocalEndpoint } from './services/ai';
import type { ArchitectureViewMode } from './services/architecture';

function App() {
  // Activity Workspace State
  const [activeTab, setActiveTab] = useState<ActivityTab>('docs');
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(false);
  const [isCustomDocModalOpen, setIsCustomDocModalOpen] = useState(false);

  // Workspace Data State
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<ASTSymbol[]>([]);
  const [fileTree, setFileTree] = useState<Set<string>>(new Set());
  const [streamingMarkdown, setStreamingMarkdown] = useState<string>('');
  const [ragChunks, setRagChunks] = useState<RAGChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [engineStatus, setEngineStatus] = useState<string>('Ready');
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Focus Citation Bridge from Architecture / Audit to RAG Inspector
  const [focusedCitation, setFocusedCitation] = useState<{ file?: string; symbol?: string } | null>(null);

  // Docs Studio State
  const [docViewMode, setDocViewMode] = useState<'preview' | 'edit'>('preview');
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [docCopied, setDocCopied] = useState(false);

  // Architecture Studio State
  const [archViewMode, setArchViewMode] = useState<ArchitectureViewMode>('system');
  const [archCopied, setArchCopied] = useState(false);

  // Pre-PR Review State
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isAuditing, setIsAuditing] = useState(false);

  // Test Suite State
  const [testFramework, setTestFramework] = useState<string>('vitest');
  const [testsCopied, setTestsCopied] = useState(false);

  // Settings State
  const [activeMode, setActiveMode] = useState<1 | 2>(() => {
    const config = getStoredProviderConfig();
    return isLocalEndpoint(config.baseUrl) ? 1 : 2;
  });

  // Theme State
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  // Inspector State
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);

    const handleSync = () => {
      const stored = getStoredTheme();
      setTheme(stored);
      applyTheme(stored);
    };

    const handleConfigSync = () => {
      const config = getStoredProviderConfig();
      setActiveMode(isLocalEndpoint(config.baseUrl) ? 1 : 2);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('vaultdoc_theme_change', handleSync);
    window.addEventListener('vaultdoc_config_change', handleConfigSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('vaultdoc_theme_change', handleSync);
      window.removeEventListener('vaultdoc_config_change', handleConfigSync);
    };
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleInsertMarkdown = (action: string) => {
    const event = new CustomEvent('vaultdoc_insert_markdown', { detail: { action } });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Inspector on Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsInspectorOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectRepo = async () => {
    try {
      const repoPath = await selectRepositoryFolder();
      if (repoPath) {
        setSelectedRepo(repoPath);
        setIsLoading(true);
        setError(null);
        setEngineStatus(`Parsing AST symbols in ${repoPath.split(/[/\\]/).pop()}...`);
        
        const parsedSymbols = await parseRepository(repoPath);
        setSymbols(parsedSymbols);
        
        const paths = new Set(parsedSymbols.map(s => s.filePath));
        setFileTree(paths);
        setEngineStatus(`Indexed ${parsedSymbols.length} AST symbols across ${paths.size} files.`);
      }
    } catch (err: any) {
      setError(`Failed to select/parse repo: ${err.message}`);
      setEngineStatus('AST parsing error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (prompt: string) => {
    if (!selectedRepo) return;
    
    setActiveTab('docs');
    setIsLoading(true);
    setError(null);
    setStreamingMarkdown('');
    setRagChunks([]);
    setEngineStatus('Ingesting AST vector context from LanceDB...');
    
    try {
      await generateDocumentation(
        selectedRepo,
        prompt,
        activeMode === 1 ? 'ollama' : 'cloud',
        (chunks) => {
          setRagChunks(chunks);
          setEngineStatus(`Retrieved ${chunks.length} AST similarity chunks.`);
        },
        (token) => {
          setStreamingMarkdown(prev => prev + token);
          setEngineStatus('Streaming specification tokens...');
        },
        (errMsg) => {
          if (errMsg.includes('Failed to connect to Ollama') || errMsg.includes('fetch failed')) {
             setError("Ollama is not running on http://localhost:11434. Please start Ollama or configure in Settings.");
          } else {
             setError(errMsg);
          }
          setIsLoading(false);
          setEngineStatus('Generation failed');
        },
        () => {
          setIsLoading(false);
          setEngineStatus('Documentation generated successfully');
        }
      );
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
      setEngineStatus('Generation error');
    }
  };

  // Top Header Handlers
  const handleExportDocMd = () => {
    if (!streamingMarkdown) return;
    const blob = new Blob([streamingMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaultdoc-specification.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportDocPdf = () => {
    window.print();
  };

  const handleCopyDoc = () => {
    if (!streamingMarkdown) return;
    navigator.clipboard.writeText(streamingMarkdown);
    setDocCopied(true);
    setTimeout(() => setDocCopied(false), 2000);
  };

  const handleSelectNodeCitation = (node: { file?: string; symbol?: string }) => {
    setFocusedCitation(node);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-vault-base relative font-sans">
      
      {/* Top Workspace Toolbar (Consolidates all canvas action buttons) */}
      <Header 
        activeTab={activeTab}
        repoName={selectedRepo ? selectedRepo.split(/[/\\]/).pop() : undefined} 
        onSelectRepo={handleSelectRepo}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeMode={activeMode}
        activeFile={ragChunks.length > 0 ? ragChunks[0].file.split(/[/\\]/).pop() : (fileTree.size > 0 ? 'vaultdoc-ast.json' : undefined)}
        currentLine={ragChunks.length > 0 ? ragChunks.length : (fileTree.size > 0 ? fileTree.size : undefined)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen(prev => !prev)}
        
        // Docs Tab Actions
        onInsertMarkdown={handleInsertMarkdown}
        activeFormats={activeFormats}
        docViewMode={docViewMode}
        onToggleDocViewMode={() => setDocViewMode(prev => prev === 'preview' ? 'edit' : 'preview')}
        onExportDocMd={handleExportDocMd}
        onExportDocPdf={handleExportDocPdf}
        onCopyDoc={handleCopyDoc}
        docCopied={docCopied}

        // Architecture Tab Actions
        archViewMode={archViewMode}
        onArchViewModeChange={setArchViewMode}
        onExportArchSvg={() => {
          const svgEl = document.querySelector('.mermaid svg');
          if (svgEl) {
            const svgData = new XMLSerializer().serializeToString(svgEl);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vaultdoc-${archViewMode}-architecture.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }}
        onCopyArchMermaid={() => {
          setArchCopied(true);
          setTimeout(() => setArchCopied(false), 2000);
        }}
        onExportArchPdf={() => window.print()}
        archCopied={archCopied}

        // Pre-PR Review Tab Actions
        severityFilter={severityFilter}
        onSeverityFilterChange={setSeverityFilter}
        onRunAudit={() => {
          setIsAuditing(true);
          setEngineStatus('Running shift-left security & logic auditors...');
        }}
        onRefreshDiff={() => {
          setEngineStatus('Refreshing local working tree diff...');
        }}
        isAuditing={isAuditing}

        // Test Suite Actions
        testFramework={testFramework}
        onTestFrameworkChange={setTestFramework}
        onCopyTests={() => {
          setTestsCopied(true);
          setTimeout(() => setTestsCopied(false), 2000);
        }}
        testsCopied={testsCopied}

        // Git / PR Actions
        onCreatePR={() => setActiveTab('git')}
      />
      
      {/* Global Error Toast */}
      {error && (
        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-50 bg-red-950/90 border border-red-500 text-white px-4 py-2 rounded-xl shadow-2xl text-xs flex items-center gap-2 print:hidden backdrop-blur-sm animate-fadeIn">
          <span>⚠️</span> <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 opacity-70 hover:opacity-100 font-bold">✕</button>
        </div>
      )}

      {/* Main Center Area: 3-Pane Modular Workbench */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Activity Dock (60px fixed width) */}
        <ActivityDock
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isFileTreeOpen={isFileTreeOpen}
          onToggleFileTree={() => setIsFileTreeOpen(prev => !prev)}
        />

        {/* Collapsible File Explorer Drawer */}
        {isFileTreeOpen && (
          <LeftSidebar 
            fileTree={fileTree} 
            onGenerate={handleGenerate}
            isLoading={isLoading}
            onClose={() => setIsFileTreeOpen(false)}
          />
        )}

        {/* Center Workspace Router */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'docs' && (
            <EditorStudio 
              markdown={streamingMarkdown} 
              isLoading={isLoading}
              viewMode={docViewMode}
              onMarkdownChange={(val) => setStreamingMarkdown(val)} 
              onActiveFormatsChange={setActiveFormats}
            />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureStudio
              symbols={symbols}
              activeView={archViewMode}
              onViewChange={setArchViewMode}
              onSelectNodeCitation={handleSelectNodeCitation}
            />
          )}

          {activeTab === 'audit' && (
            <PrePRStudio
              symbols={symbols}
              selectedRepo={selectedRepo}
              activeSeverityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              onSelectFindingCitation={(finding) => {
                setFocusedCitation({ file: finding.file, symbol: finding.symbol });
              }}
            />
          )}

          {activeTab === 'spec' && (
            <TicketSpecStudio
              symbols={symbols}
              onExportToDocs={(specMd) => {
                setStreamingMarkdown(specMd);
                setActiveTab('docs');
              }}
            />
          )}

          {activeTab === 'tests' && (
            <TestSuiteStudio symbols={symbols} />
          )}

          {activeTab === 'git' && (
            <GitPRStudio onOpenSettings={() => setIsSettingsOpen(true)} />
          )}

          {activeTab === 'chat' && (
            <ChatStudio symbols={symbols} />
          )}
        </main>

        {/* Right Sidebar: Full-Height RAG Context Inspector */}
        <RAGInspector 
          chunks={ragChunks} 
          focusedTarget={focusedCitation}
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
        />
      </div>

      {/* Bottom Footer Telemetry Status Bar (Strictly Single-Line) */}
      <FooterStatusBar 
        engineStatus={engineStatus}
        isBusy={isLoading || isAuditing}
        activeMode={activeMode}
        symbolCount={symbols.length}
        currentBranch="main"
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          theme={theme}
          onThemeChange={handleThemeChange}
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}

      {/* Custom Document Modal */}
      {isCustomDocModalOpen && (
        <CustomDocumentModal 
          onClose={() => setIsCustomDocModalOpen(false)} 
          onGenerate={handleGenerate} 
        />
      )}
    </div>
  );
}

export default App;
