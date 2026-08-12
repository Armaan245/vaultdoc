import React, { useState } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import EditorStudio from './components/EditorStudio';
import RAGInspector from './components/RAGInspector';
import { selectRepositoryFolder, parseRepository, generateDocumentation } from './services/vaultdoc';
import type { ASTSymbol, RAGChunk } from './services/vaultdoc';

function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [astSymbols, setAstSymbols] = useState<ASTSymbol[]>([]);
  const [streamingMarkdown, setStreamingMarkdown] = useState<string>('');
  const [ragChunks, setRagChunks] = useState<RAGChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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
        setAstSymbols(symbols);
        
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
    
    // Add custom loading message
    setStreamingMarkdown('> *Initializing RAG Pipeline (LanceDB + Ollama)...*\n\n');

    try {
      await generateDocumentation(
        selectedRepo,
        prompt,
        'ollama',
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

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-vault-base">
      <Header repoName={selectedRepo ? selectedRepo.split(/[/\\]/).pop() : undefined} />
      
      {/* Global Error Toast */}
      {error && (
        <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-50 bg-red-900 border border-red-500 text-white px-4 py-2 rounded shadow-lg text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
          <button onClick={() => setError(null)} className="ml-4 opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar 
          fileTree={fileTree} 
          onSelectRepo={handleSelectRepo} 
          onGenerate={handleGenerate}
          isLoading={isLoading}
        />
        <EditorStudio 
          markdown={streamingMarkdown} 
          isLoading={isLoading} 
        />
        <RAGInspector chunks={ragChunks} />
      </div>
    </div>
  );
}

export default App;
