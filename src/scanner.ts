import fs from 'fs';
import path from 'path';
import ignore, { Ignore } from 'ignore';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const ALWAYS_IGNORE = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.tauri',
  'target',
  '.vs',
  '.idea',
  '.vscode',
  'coverage',
  '__pycache__',
  '.rustup',
  '.cargo'
];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.mp4', '.mp3', '.wav', '.ogg',
  '.pdf', '.zip', '.tar', '.gz', '.rar',
  '.exe', '.dll', '.so', '.dylib',
  '.wasm'
]);

const ALLOWED_EXTENSIONS = new Set([
  // Code
  '.ts', '.tsx', '.js', '.jsx', '.go', '.py', '.rs', '.java', '.cpp', '.c', '.cs', '.sql', '.php', '.rb', '.swift', '.kt',
  // Config & Markup
  '.json', '.yaml', '.yml', '.toml', '.xml', '.html', '.css', '.scss', '.mjs',
  // Docs
  '.md', '.mdx', '.txt', '.csv'
]);

function isBinary(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function isAllowedExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
}

export async function scanDirectory(dirPath: string): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];
  const ig = ignore();
  
  // Try to read .gitignore if it exists
  const gitignorePath = path.join(dirPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = await fs.promises.readFile(gitignorePath, 'utf-8');
    ig.add(gitignoreContent);
  }

  ig.add(ALWAYS_IGNORE);

  async function walk(currentPath: string, relativePath: string) {
    const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = path.join(relativePath, entry.name).replace(/\\/g, '/');
      const entryAbsolutePath = path.join(currentPath, entry.name);

      if (ig.ignores(entryRelativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(entryAbsolutePath, entryRelativePath);
      } else if (entry.isFile()) {
        if (isBinary(entry.name)) continue;
        if (!isAllowedExtension(entry.name)) continue;

        const stat = await fs.promises.stat(entryAbsolutePath);
        if (stat.size > MAX_FILE_SIZE) {
          continue;
        }

        files.push({
          absolutePath: entryAbsolutePath,
          relativePath: entryRelativePath
        });
      }
    }
  }

  await walk(dirPath, '');
  return files;
}
