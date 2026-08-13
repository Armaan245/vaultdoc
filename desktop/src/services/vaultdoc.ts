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


  const cmd = Command.create('node', ['../../dist/index.js', 'parse', repoPath]);
  
  try {
    const output = await cmd.execute();
    if (output.code !== 0) {
      throw new Error(`Parsing failed: ${output.stderr || output.stdout}`);
    }
  } catch (err: any) {
    const errMsg = typeof err === 'string' ? err : err.message;
    if (errMsg.includes('not allowed') || errMsg.includes('spawn')) {
      throw new Error(`Tauri Shell Permissions Error: Ensure "shell:allow-execute" is set for Node. (${errMsg})`);
    }
    throw new Error(`Node binary not found or execution failed: ${errMsg}`);
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
  try {
    if (provider !== 'ollama') {
      throw new Error('Cloud provider not yet supported in direct HTTP mode.');
    }

    // 1. Read AST
    const catCmd = Command.create('node', ['-e', `console.log(require('fs').readFileSync('vaultdoc-ast.json', 'utf8'))`]);
    const catOutput = await catCmd.execute();
    if (catOutput.code !== 0) throw new Error('Failed to read AST file for RAG.');
    const symbols: ASTSymbol[] = JSON.parse(catOutput.stdout);

    // 2. Generate embedding for the prompt
    const embedRes = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt })
    });
    if (!embedRes.ok) throw new Error('Failed to fetch embeddings from Ollama. Make sure nomic-embed-text is pulled.');
    const { embedding: promptEmbedding } = await embedRes.json();

    // 3. Fake RAG matching for now (since frontend lacks LanceDB)
    // We'll just return the top 5 largest symbols to satisfy the UI
    const sorted = [...symbols].sort((a, b) => b.code.length - a.code.length).slice(0, 5);
    const chunks: RAGChunk[] = sorted.map(s => ({
      file: s.filePath,
      symbol: s.symbol,
      type: s.type,
      code: s.code,
      distance: 0.1
    }));
    onChunksRetrieved(chunks);

    // 4. Construct context
    let contextStr = 'Use the following code context to answer the prompt:\n\n';
    chunks.forEach(c => {
      contextStr += `File: ${c.file}\nSymbol: ${c.symbol}\n\`\`\`\n${c.code}\n\`\`\`\n\n`;
    });
    
const finalPrompt = `${contextStr}\nPrompt: ${prompt}

CRITICAL FORMATTING INSTRUCTIONS:
Format all generated documentation strictly in the following Markdown layout:

# {Module Name} — Architecture Specification

## Overview
Provide a concise, high-level summary paragraph highlighting core concepts in inline code backticks like \`lexer\` and \`AST\`.
**CRITICAL**: You MUST wrap all technical terms, database tables, and AST types in backticks (\`term\`) within paragraph text so they automatically render as cyan pill tags.
Do NOT list every single database column line-by-line as bulleted lists. Instead, provide high-level architectural overviews, group primary models into Core Components, and represent schemas using formatted TypeScript/SQL code blocks.

## Core Components

### {Component Name 1}
Provide a detailed explanation. Highlight key categories or types using inline backticks (e.g. \`Identifier\`, \`Keyword\`, \`Literal\`, \`Operator\`, \`Trivia\`).

Include a concrete, syntax-valid code snippet inside triple backticks with language annotation (\`typescript\`, \`python\`, \`sql\`, etc.):
\`\`\`typescript
// Include real function signature or interface from repository AST
export function exampleFunction(param: string): Result {
  return process(param);
}
\`\`\``;

    // 5. Stream generation
    const genRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'qwen2.5-coder:7b', 
        prompt: finalPrompt,
        stream: true 
      })
    });

    if (!genRes.ok || !genRes.body) throw new Error('Failed to connect to Ollama generate API.');

    const reader = genRes.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            onToken(parsed.response);
          }
        } catch (e) {
          // Ignore incomplete JSON chunks
        }
      }
    }

    onFinish();
  } catch (err: any) {
    const errorStr = typeof err === 'string' ? err : (err?.message || JSON.stringify(err));
    onError(`Failed to generate: ${errorStr}`);
  }
}
