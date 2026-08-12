import { open } from '@tauri-apps/plugin-dialog';
import { Command } from '@tauri-apps/plugin-shell';

export interface ASTSymbol {
  symbol: string;
  type: string;
  code: string;
  filePath: string;
  startLine: number;
  endLine: number;
}

export interface RAGChunk {
  file: string;
  symbol: string;
  type: string;
  code: string;
  distance: number;
}

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Opens a Tauri folder selection dialog.
 */
export async function selectRepositoryFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Repository Folder',
  });
  return typeof selected === 'string' ? selected : null;
}

/**
 * Calls the Node CLI to parse the selected directory.
 * Returns the AST symbols.
 */
export async function parseRepository(repoPath: string): Promise<ASTSymbol[]> {


  const cmd = Command.create('node', ['../dist/index.js', 'parse', repoPath]);
  
  const output = await cmd.execute();
  if (output.code !== 0) {
    throw new Error(`Parsing failed: ${output.stderr || output.stdout}`);
  }

  const catCmd = Command.create('node', ['-e', `console.log(require('fs').readFileSync('vaultdoc-ast.json', 'utf8'))`]);
  const catOutput = await catCmd.execute();
  if (catOutput.code !== 0) {
    throw new Error('Failed to read AST file.');
  }

  return JSON.parse(catOutput.stdout);
}

/**
 * Spawns the generator service and streams tokens.
 */
export async function generateDocumentation(
  repoPath: string,
  prompt: string,
  provider: 'ollama' | 'cloud',
  onChunksRetrieved: (chunks: RAGChunk[]) => void,
  onToken: (token: string) => void,
  onError: (err: string) => void,
  onFinish: () => void
): Promise<void> {


  const cmd = Command.create('node', ['../dist/index.js', 'generate', prompt, '--provider', provider]);

  cmd.on('close', (data) => {
    if (data.code !== 0) {
      onError(`Process exited with code ${data.code}`);
    } else {
      onFinish();
    }
  });

  cmd.on('error', (error) => {
    onError(`Process error: ${error}`);
  });

  let buffer = '';

  cmd.stdout.on('data', (line) => {
    buffer += line;
    
    const ragMatch = buffer.match(/__VAULTDOC_RAG_CHUNKS:\s*(\[.*\])/s);
    if (ragMatch) {
      try {
        const chunks = JSON.parse(ragMatch[1]);
        onChunksRetrieved(chunks);
        buffer = buffer.replace(ragMatch[0], '');
      } catch (e) {
        return;
      }
    }

    if (!buffer.includes('__VAULTDOC_RAG_CHUNKS')) {
      onToken(buffer);
      buffer = '';
    }
  });

  cmd.stderr.on('data', (line) => {
    console.warn('CLI STDERR:', line);
    if (line.toLowerCase().includes('error')) {
      onError(line);
    }
  });

  try {
    await cmd.spawn();
  } catch (err: any) {
    onError(err.message || 'Failed to start process');
  }
}
