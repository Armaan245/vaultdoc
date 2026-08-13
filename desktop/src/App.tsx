import { useState, useEffect } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import EditorStudio from './components/EditorStudio';
import RAGInspector from './components/RAGInspector';
import SettingsModal from './components/SettingsModal';
import { selectRepositoryFolder, parseRepository, generateDocumentation } from './services/vaultdoc';
import type { RAGChunk } from './services/vaultdoc';
import { getStoredTheme, applyTheme } from './services/theme';
import type { Theme } from './services/theme';
import { getStoredProviderConfig, isLocalEndpoint } from './services/ai';

function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [streamingMarkdown, setStreamingMarkdown] = useState<string>('');
  const [ragChunks, setRagChunks] = useState<RAGChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings State
  const [activeMode, setActiveMode] = useState<1 | 2>(() => {
    const config = getStoredProviderConfig();
    return isLocalEndpoint(config.baseUrl) ? 1 : 2;
  });

  // Theme State
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

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

  // A mapping of file paths to extension/folder structure for the LeftSidebar
  const [fileTree, setFileTree] = useState<Set<string>>(new Set());

  const handleSelectRepo = async () => {
    try {
      const repoPath = await selectRepositoryFolder();
      if (repoPath) {
        setSelectedRepo(repoPath);
        setIsLoading(true);
        setError(null);
        
        const symbols = await parseRepository(repoPath);
        
        const paths = new Set(symbols.map(s => s.filePath));
        setFileTree(paths);
      }
    } catch (err: any) {
      setError(`Failed to select/parse repo: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (prompt: string) => {
    if (!selectedRepo) return;
    
    setIsLoading(true);
    setError(null);
    setStreamingMarkdown('');
    setRagChunks([]);
    
    try {
      await generateDocumentation(
        selectedRepo,
        prompt,
        activeMode === 1 ? 'ollama' : 'cloud',
        (chunks) => {
          setRagChunks(chunks);
        },
        (token) => {
          setStreamingMarkdown(prev => prev + token);
        },
        (errMsg) => {
          if (errMsg.includes('Failed to connect to Ollama') || errMsg.includes('fetch failed')) {
             setError("Ollama is not running on http://localhost:11434. Please start Ollama or switch to Cloud Mode.");
          } else {
             setError(errMsg);
          }
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
        }
      );
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-vault-base relative">
      <Header 
        repoName={selectedRepo ? selectedRepo.split(/[/\\]/).pop() : undefined} 
        onSelectRepo={handleSelectRepo}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onInsertMarkdown={handleInsertMarkdown}
        activeFormats={activeFormats}
        activeFile={ragChunks.length > 0 ? ragChunks[0].file.split(/[/\\]/).pop() : (fileTree.size > 0 ? 'vaultdoc-ast.json' : undefined)}
        currentLine={ragChunks.length > 0 ? ragChunks.length : (fileTree.size > 0 ? fileTree.size : undefined)}
        activeMode={activeMode}
      />
      
      {/* Global Error Toast */}
      {error && (
        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-50 bg-red-900 border border-red-500 text-white px-4 py-2 rounded shadow-lg text-sm flex items-center gap-2 print:hidden">
          <span>⚠️</span> {error}
          <button onClick={() => setError(null)} className="ml-4 opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar 
          fileTree={fileTree} 
          onGenerate={handleGenerate}
          isLoading={isLoading}
        />
        <EditorStudio 
          markdown={streamingMarkdown} 
          isLoading={isLoading}
          onMarkdownChange={(val) => setStreamingMarkdown(val)} 
          onActiveFormatsChange={setActiveFormats}
        />
        <RAGInspector chunks={ragChunks} />
      </div>

      {isSettingsOpen && (
        <SettingsModal 
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          theme={theme}
          onThemeChange={handleThemeChange}
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}
    </div>
  );
}

export default App;
