import { useState, useEffect } from 'react';

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

import SettingsModal from './components/SettingsModal';
import CustomDocumentModal from './components/CustomDocumentModal';
import CreateProjectModal from './components/CreateProjectModal';
import { parseRepository, generateDocumentation } from './services/vaultdoc';
import type { ASTSymbol, RAGChunk } from './services/vaultdoc';
import { getStoredTheme, applyTheme, type Theme } from './services/theme';
import { getStoredProviderConfig, isLocalEndpoint } from './services/ai';
import { 
  getStoredProjects, 
  saveStoredProjects, 
  getStoredActiveProject, 
  saveStoredActiveProject 
} from './services/chatSessions';
import type { ArchitectureViewMode } from './services/architecture';

import Titlebar from './components/Titlebar';

function App() {
  // Activity Workspace State - Default to 'chat' (Center Intent Command Center)
  const [activeTab, setActiveTab] = useState<ActivityTab>('chat');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(false);
  const [isCustomDocModalOpen, setIsCustomDocModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  // Active Workspace / Project State
  const [activeProject, setActiveProject] = useState<string>(getStoredActiveProject);
  const [projects, setProjects] = useState<{ id: string; name: string; path?: string }[]>(getStoredProjects);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<ASTSymbol[]>([]);
  const [fileTree, setFileTree] = useState<Set<string>>(new Set());
  const [streamingMarkdown, setStreamingMarkdown] = useState<string>('');
  const [ragChunks, setRagChunks] = useState<RAGChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const setEngineStatus = (_msg: string) => {};
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialCategory, setSettingsInitialCategory] = useState<string>('general');

  // Focus Citation Bridge from Architecture / Audit / Chat to RAG Inspector
  const [focusedCitation, setFocusedCitation] = useState<{ file?: string; symbol?: string } | null>(null);

  // Docs Studio State
  const [docViewMode] = useState<'preview' | 'edit'>('preview');

  // Architecture Studio State
  const [archViewMode, setArchViewMode] = useState<ArchitectureViewMode>('system');

  // Pre-PR Review State
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Test Suite State
  // (removed testFramework)

  // Settings State
  const [activeMode, setActiveMode] = useState<1 | 2>(() => {
    const config = getStoredProviderConfig();
    return isLocalEndpoint(config.baseUrl) ? 1 : 2;
  });

  // Theme State
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  // Inspector State
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Load default symbols on mount
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

    const handleProjectsSync = () => {
      setProjects(getStoredProjects());
      setActiveProject(getStoredActiveProject());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('vaultdoc_theme_change', handleSync);
    window.addEventListener('vaultdoc_config_change', handleConfigSync);
    window.addEventListener('vaultdoc_projects_change', handleProjectsSync);

    // Initial load of AST symbols if a real project is active
    const curActive = getStoredActiveProject();
    if (curActive) {
      loadWorkspaceAST(curActive);
    }

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('vaultdoc_theme_change', handleSync);
      window.removeEventListener('vaultdoc_config_change', handleConfigSync);
      window.removeEventListener('vaultdoc_projects_change', handleProjectsSync);
    };
  }, []);

  const loadWorkspaceAST = async (projectName: string) => {
    try {
      const existingProj = projects.find(p => p.id === projectName || p.name === projectName);
      const targetPath = existingProj?.path || selectedRepo;
      if (targetPath) {
        setIsLoading(true);
        const parsedSymbols = await parseRepository(targetPath);
        setSymbols(parsedSymbols);
        setFileTree(new Set(parsedSymbols.map(s => s.filePath)));
        setEngineStatus(`Loaded ${parsedSymbols.length} AST symbols for ${projectName}`);
        setIsLoading(false);
        return;
      }
      setSymbols([]);
      setFileTree(new Set());
      setEngineStatus(`Workspace ${projectName} ready.`);
    } catch (err: any) {
      setSymbols([]);
      setFileTree(new Set());
      console.warn('Could not load AST symbols:', err);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };



  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Right Side Panel (RAG Context Inspector) on Ctrl+Alt+B or Ctrl+Shift+B
      if ((e.ctrlKey || e.metaKey) && (e.altKey || e.shiftKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsInspectorOpen(prev => !prev);
        return;
      }
      // Toggle Left Sidebar on Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateProject = async (projectName: string, folderPath?: string) => {
    const newProj = { id: projectName, name: projectName, path: folderPath };
    const curProjects = getStoredProjects();
    const updated = curProjects.some(p => p.id === projectName) ? curProjects : [...curProjects, newProj];
    saveStoredProjects(updated);
    saveStoredActiveProject(projectName);
    setProjects(updated);
    setActiveProject(projectName);

    if (folderPath) {
      setSelectedRepo(folderPath);
      setIsLoading(true);
      setError(null);
      setEngineStatus(`Indexing AST for ${projectName}...`);
      try {
        const parsedSymbols = await parseRepository(folderPath);
        setSymbols(parsedSymbols);
        const paths = new Set(parsedSymbols.map(s => s.filePath));
        setFileTree(paths);
        setEngineStatus(`Indexed ${parsedSymbols.length} AST symbols for ${projectName}`);
      } catch (err: any) {
        console.warn('AST parsing error:', err);
        loadWorkspaceAST(projectName);
      } finally {
        setIsLoading(false);
      }
    } else {
      loadWorkspaceAST(projectName);
    }
  };

  const handleSelectWorkspaceProject = (projectName: string) => {
    saveStoredActiveProject(projectName);
    setActiveProject(projectName);
    const existingProj = projects.find(p => p.id === projectName);
    if (existingProj) {
      const stored = getStoredProjects();
      if (!stored.some(p => p.id === existingProj.id)) {
        saveStoredProjects([...stored, existingProj]);
      }
      if (existingProj.path) {
        setSelectedRepo(existingProj.path);
      }
    }
    if (projectName) {
      loadWorkspaceAST(projectName);
    } else {
      setSymbols([]);
      setFileTree(new Set());
    }
  };

  const handleGenerate = async (prompt: string) => {
    const repoTarget = selectedRepo || activeProject;
    
    setActiveTab('docs');
    setIsLoading(true);
    setError(null);
    setStreamingMarkdown('');
    setRagChunks([]);
    setEngineStatus('Ingesting AST vector context from LanceDB...');
    
    try {
      await generateDocumentation(
        repoTarget,
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



  const handleSelectNodeCitation = (node: { file?: string; symbol?: string }) => {
    setFocusedCitation(node);
    setIsInspectorOpen(true);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#18181b] text-vault-textBody relative font-sans">
      <Titlebar 
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
      />
      
      {/* Global Error Toast */}
      {error && (
        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-50 bg-red-950/90 border border-red-500 text-white px-4 py-2 rounded-xl shadow-2xl text-xs flex items-center gap-2 print:hidden backdrop-blur-sm animate-fadeIn">
          <span>⚠️</span> <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 opacity-70 hover:opacity-100 font-bold">✕</button>
        </div>
      )}

      {/* Main Layout: Collapsible Navigation Rail + Center Intent Workspace + Context Inspector */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Navigation Rail (240px fixed width, collapsible) */}
        {isSidebarOpen && (
          <ActivityDock
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeProject={activeProject}
            projects={projects}
            activeSessionId={activeSessionId}
            onSelectSession={(sessId) => {
              setActiveSessionId(sessId);
              setActiveTab('chat');
            }}
            onSelectProject={handleSelectWorkspaceProject}
            onOpenFolder={() => setIsCreateProjectModalOpen(true)}
            onOpenSettings={(cat) => {
              setSettingsInitialCategory(cat || 'general');
              setIsSettingsOpen(true);
            }}
            onSelectRecent={(recentId) => {
              setActiveSessionId(recentId);
              setActiveTab('chat');
            }}
            onNewSession={() => {
              setActiveSessionId(null);
              setActiveTab('chat');
            }}
          />
        )}

        {/* Collapsible File Explorer Drawer (when opened) */}
        {isFileTreeOpen && (
          <LeftSidebar 
            fileTree={fileTree} 
            onGenerate={handleGenerate}
            isLoading={isLoading}
            onClose={() => setIsFileTreeOpen(false)}
          />
        )}

        {/* Center Workspace Router */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#0B0C10]">
          
          {/* Chat / New Session / Center Intent Command Center */}
          <div className={activeTab === 'chat' ? 'h-full w-full flex-1 flex flex-col' : 'hidden'}>
            <ChatStudio 
              symbols={symbols} 
              activeProject={activeProject}
              projects={projects}
              activeSessionId={activeSessionId}
              onSelectSessionId={setActiveSessionId}
              onSelectProject={() => setIsCreateProjectModalOpen(true)}
              onSelectProjectName={handleSelectWorkspaceProject}
              onNavigateTab={(targetTab: 'architecture' | 'spec' | 'audit' | 'tests') => setActiveTab(targetTab)}
              onSelectCitation={handleSelectNodeCitation}
              isInspectorOpen={isInspectorOpen}
              onToggleInspector={() => setIsInspectorOpen(prev => !prev)}
            />
          </div>

          {/* Architecture Studio */}
          <div className={activeTab === 'architecture' ? 'h-full w-full flex-1' : 'hidden'}>
            <ArchitectureStudio
              symbols={symbols}
              activeView={archViewMode}
              onViewChange={setArchViewMode}
              onSelectNodeCitation={handleSelectNodeCitation}
            />
          </div>

          {/* Pre-PR Review Studio */}
          <div className={activeTab === 'audit' ? 'h-full w-full flex-1' : 'hidden'}>
            <PrePRStudio
              symbols={symbols}
              selectedRepo={selectedRepo}
              activeSeverityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              onSelectFindingCitation={(finding) => {
                setFocusedCitation({ file: finding.file, symbol: finding.symbol });
                setIsInspectorOpen(true);
              }}
            />
          </div>

          {/* Ticket Spec Studio */}
          <div className={activeTab === 'spec' ? 'h-full w-full flex-1' : 'hidden'}>
            <TicketSpecStudio
              symbols={symbols}
              onExportToDocs={(specMd) => {
                setStreamingMarkdown(specMd);
                setActiveTab('docs');
              }}
            />
          </div>

          {/* Test Suite Studio */}
          <div className={activeTab === 'tests' ? 'h-full w-full flex-1' : 'hidden'}>
            <TestSuiteStudio symbols={symbols} />
          </div>

          {/* Git / PR Studio */}
          <div className={activeTab === 'git' ? 'h-full w-full flex-1' : 'hidden'}>
            <GitPRStudio onOpenSettings={() => {
              setSettingsInitialCategory('general');
              setIsSettingsOpen(true);
            }} />
          </div>

          {/* Docs / Technical Specification Editor */}
          <div className={activeTab === 'docs' ? 'h-full w-full flex-1' : 'hidden'}>
            <EditorStudio 
              markdown={streamingMarkdown} 
              isLoading={isLoading}
              viewMode={docViewMode}
              onMarkdownChange={(val) => setStreamingMarkdown(val)} 
              onActiveFormatsChange={() => {}}
            />
          </div>
        </main>

        {/* Right Sidebar: Full-Height RAG Context Inspector */}
        <RAGInspector 
          chunks={ragChunks} 
          focusedTarget={focusedCitation}
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
        />
      </div>



      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          theme={theme}
          onThemeChange={handleThemeChange}
          onClose={() => setIsSettingsOpen(false)} 
          initialCategory={settingsInitialCategory as any}
        />
      )}

      {/* Custom Document Modal */}
      {isCustomDocModalOpen && (
        <CustomDocumentModal 
          onClose={() => setIsCustomDocModalOpen(false)} 
          onGenerate={handleGenerate} 
        />
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}

export default App;
