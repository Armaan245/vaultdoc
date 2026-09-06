import fs from 'fs';
import path from 'path';
const Parser = require('web-tree-sitter');
import { ExtractedSymbol, SymbolType } from './types';

// Map file extensions to their corresponding tree-sitter wasm files
const LANG_WASM: Record<string, string> = {
  '.ts': 'tree-sitter-typescript.wasm',
  '.tsx': 'tree-sitter-tsx.wasm',
  '.js': 'tree-sitter-javascript.wasm',
  '.jsx': 'tree-sitter-javascript.wasm',
  '.mjs': 'tree-sitter-javascript.wasm',
  '.cjs': 'tree-sitter-javascript.wasm',
  '.py': 'tree-sitter-python.wasm',
  '.go': 'tree-sitter-go.wasm',
  '.rs': 'tree-sitter-rust.wasm',
  '.c': 'tree-sitter-c.wasm',
  '.h': 'tree-sitter-c.wasm',
  '.cpp': 'tree-sitter-cpp.wasm',
  '.hpp': 'tree-sitter-cpp.wasm',
  '.cc': 'tree-sitter-cpp.wasm',
  '.cs': 'tree-sitter-c_sharp.wasm',
  '.java': 'tree-sitter-java.wasm',
  '.rb': 'tree-sitter-ruby.wasm',
  '.php': 'tree-sitter-php.wasm',
  '.swift': 'tree-sitter-swift.wasm',
  '.kt': 'tree-sitter-kotlin.wasm',
  '.sh': 'tree-sitter-bash.wasm',
  '.bash': 'tree-sitter-bash.wasm',
};

let parserReady = false;
const parsers: Record<string, any> = {};

/**
 * Resolves the directory containing Tree-sitter WASM grammar files.
 * Supports development, Tauri bundled resources, and Electron extraResources.
 */
export function getWasmDirectory(): string {
  const candidatePaths: string[] = [];

  if (process.env.VAULTDOC_WASM_DIR) {
    candidatePaths.push(process.env.VAULTDOC_WASM_DIR);
  }

  // Electron production packaged resourcesPath
  if ((process as any).resourcesPath) {
    candidatePaths.push(
      path.join((process as any).resourcesPath, 'resources', 'tree-sitter'),
      path.join((process as any).resourcesPath, 'tree-sitter')
    );
  }

  // Local resources directory
  candidatePaths.push(
    path.join(process.cwd(), 'resources', 'tree-sitter'),
    path.join(process.cwd(), 'desktop', 'src-tauri', 'resources', 'tree-sitter'),
    path.join(__dirname, '..', 'resources', 'tree-sitter'),
    path.join(__dirname, '..', 'desktop', 'src-tauri', 'resources', 'tree-sitter'),
    path.join(__dirname, '..', 'node_modules', 'tree-sitter-wasms', 'out'),
    path.join(process.cwd(), 'node_modules', 'tree-sitter-wasms', 'out')
  );

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'tree-sitter-typescript.wasm'))) {
      return candidate;
    }
  }

  // Fallback to node_modules path
  return path.join(__dirname, '..', 'node_modules', 'tree-sitter-wasms', 'out');
}

export async function initParser() {
  if (parserReady) return;
  await Parser.init();
  
  const wasmDir = getWasmDirectory();

  for (const [ext, wasmFile] of Object.entries(LANG_WASM)) {
    if (!parsers[ext]) {
      const wasmPath = path.join(wasmDir, wasmFile);
      if (fs.existsSync(wasmPath)) {
        try {
          const lang = await Parser.Language.load(wasmPath);
          parsers[ext] = lang;
        } catch (e: any) {
          console.warn(`Failed to load language for ${ext} at ${wasmPath}:`, e.message || e);
        }
      }
    }
  }

  parserReady = true;
}

export function parseFile(absolutePath: string, relativePath: string): ExtractedSymbol[] {
  const ext = path.extname(absolutePath).toLowerCase();
  const lang = parsers[ext];
  
  if (!lang) {
    const configDocsExts = ['.json', '.yaml', '.yml', '.toml', '.xml', '.html', '.css', '.scss', '.md', '.mdx', '.txt', '.csv', '.sql'];
    if (configDocsExts.includes(ext)) {
      try {
        const code = fs.readFileSync(absolutePath, 'utf8');
        return [{
          symbol: path.basename(absolutePath),
          type: ext === '.sql' ? 'schema' : (['.md', '.mdx', '.txt', '.csv'].includes(ext) ? 'doc' : 'metadata'),
          code,
          filePath: relativePath,
          startLine: 1,
          endLine: code.split('\n').length
        }];
      } catch (err) {
        console.warn(`Failed to read file ${absolutePath} as raw text:`, err);
        return [];
      }
    }
    return [];
  }

  const parser = new Parser();
  parser.setLanguage(lang);

  // Implement chunked reader to avoid loading entire file into memory as single string
  const fd = fs.openSync(absolutePath, 'r');
  const stat = fs.statSync(absolutePath);
  const fileSize = stat.size;

  const buffer = Buffer.alloc(8192); // 8KB chunk
  
  const input = (index: number) => {
    if (index >= fileSize) return null;
    const toRead = Math.min(buffer.length, fileSize - index);
    const bytesRead = fs.readSync(fd, buffer, 0, toRead, index);
    if (bytesRead === 0) return null;
    return buffer.toString('utf8', 0, bytesRead);
  };

  const tree = parser.parse(input);
  
  const symbols: ExtractedSymbol[] = [];

  function traverse(node: any) {
    let type: SymbolType | null = null;
    let name = '';

    // TypeScript / JavaScript
    if (node.type === 'function_declaration') {
      type = 'function';
      name = node.childForFieldName('name')?.text || 'anonymous';
    } else if (node.type === 'class_declaration') {
      type = 'class';
      name = node.childForFieldName('name')?.text || 'anonymous';
    } else if (node.type === 'export_statement') {
      type = 'export';
      name = 'export'; // exact name can be complex to extract for all export types
    } else if (node.type === 'interface_declaration') {
      type = 'interface';
      name = node.childForFieldName('name')?.text || 'anonymous';
    } else if (node.type === 'type_alias_declaration') {
      type = 'type alias';
      name = node.childForFieldName('name')?.text || 'anonymous';
    } else if (node.type === 'enum_declaration') {
      type = 'enum';
      name = node.childForFieldName('name')?.text || 'anonymous';
    }
    // Python
    else if (node.type === 'function_definition') {
      type = 'function';
      name = node.childForFieldName('name')?.text || 'anonymous';
    } else if (node.type === 'class_definition') {
      type = 'class';
      name = node.childForFieldName('name')?.text || 'anonymous';
    }
    // Go
    else if (node.type === 'function_declaration' || node.type === 'method_declaration') {
      type = 'function';
      name = node.childForFieldName('name')?.text || 'anonymous';
    } else if (node.type === 'type_declaration') {
      type = 'interface'; // Go types can be structs, interfaces, etc. Simplified here.
      name = 'type';
    }
    // Rust
    else if (node.type === 'function_item') {
      type = 'function';
      name = node.childForFieldName('name')?.text || 'anonymous';
    } else if (node.type === 'struct_item') {
      type = 'class';
      name = node.childForFieldName('name')?.text || 'anonymous';
    } else if (node.type === 'enum_item') {
      type = 'enum';
      name = node.childForFieldName('name')?.text || 'anonymous';
    } else if (node.type === 'type_item') {
      type = 'type alias';
      name = node.childForFieldName('name')?.text || 'anonymous';
    }

    if (type) {
      // Read exact code chunk for this node from file
      const nodeLength = node.endIndex - node.startIndex;
      const codeBuffer = Buffer.alloc(nodeLength);
      fs.readSync(fd, codeBuffer, 0, nodeLength, node.startIndex);
      const code = codeBuffer.toString('utf8');

      // Note: we can't reliably use `node.text` when parsing with an input callback
      // because web-tree-sitter does not assemble the full string.
      // We manually read the boundaries!

      symbols.push({
        symbol: name,
        type,
        code,
        filePath: relativePath,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
      });
    }

    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(tree.rootNode);

  fs.closeSync(fd);
  tree.delete();
  parser.delete();

  return symbols;
}
