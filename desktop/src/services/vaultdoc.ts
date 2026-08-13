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
import { getStoredProviderConfig } from './ai';

export async function generateDocumentation(
  repoPath: string,
  prompt: string,
  providerParam: 'ollama' | 'cloud',
  onChunksRetrieved: (chunks: RAGChunk[]) => void,
  onToken: (token: string) => void,
  onError: (err: string) => void,
  onFinish: () => void
): Promise<void> {
  try {
    const config = getStoredProviderConfig();
    const baseUrl = config.baseUrl.replace(/\/$/, '');

    // 1. Read AST
    const catCmd = Command.create('node', ['-e', `console.log(require('fs').readFileSync('vaultdoc-ast.json', 'utf8'))`]);
    const catOutput = await catCmd.execute();
    if (catOutput.code !== 0) throw new Error('Failed to read AST file for RAG.');
    const symbols: ASTSymbol[] = JSON.parse(catOutput.stdout);

    // 2. Fetch Embeddings (if endpoint available)
    try {
      const embedUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/embeddings` : `${baseUrl}/api/embeddings`;
      await fetch(embedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.model, prompt })
      });
    } catch (e) {
      // Optional fallback
    }

    // 3. Fake RAG matching for top AST symbols
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

    // 5. Dynamic Client Streaming Request
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey && config.apiKey.trim().length > 0) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    } else {
      headers['Authorization'] = 'Bearer local';
    }

    const isOpenAIFormat = config.provider === 'lmstudio' || config.provider === 'custom' || baseUrl.endsWith('/v1');
    const endpointUrl = isOpenAIFormat 
      ? (baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`)
      : `${baseUrl}/api/generate`;

    const requestBody = isOpenAIFormat
      ? JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: 'You are VaultDoc AI technical specification generator.' },
            { role: 'user', content: finalPrompt }
          ],
          stream: true
        })
      : JSON.stringify({
          model: config.model,
          prompt: finalPrompt,
          stream: true
        });

    const genRes = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: requestBody
    });

    if (!genRes.ok || !genRes.body) throw new Error(`Failed to connect to AI provider (${genRes.status} ${genRes.statusText}).`);

    const reader = genRes.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value, { stream: true });

      if (isOpenAIFormat) {
        const lines = chunkStr.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) onToken(content);
            } catch (e) {}
          }
        }
      } else {
        const lines = chunkStr.split('\n').filter(l => l.trim().length > 0);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              onToken(parsed.response);
            }
          } catch (e) {}
        }
      }
    }

    onFinish();
  } catch (err: any) {
    const errorStr = typeof err === 'string' ? err : (err?.message || JSON.stringify(err));
    onError(`Failed to generate: ${errorStr}`);
  }
}
