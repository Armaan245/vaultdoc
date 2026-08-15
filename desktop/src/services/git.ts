import { Command } from '@tauri-apps/plugin-shell';

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: string[];
}

export interface GitFileDiff {
  filePath: string;
  oldPath?: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  hunks: GitDiffHunk[];
  rawDiff: string;
  addedCount: number;
  deletedCount: number;
}

export interface GitRepoState {
  currentBranch: string;
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  fileDiffs: GitFileDiff[];
  rawDiff: string;
}

/**
 * Parses raw git diff string into structured file diffs and hunks.
 */
export function parseRawGitDiff(rawDiff: string): GitFileDiff[] {
  if (!rawDiff || !rawDiff.trim()) return [];

  const fileDiffs: GitFileDiff[] = [];
  const fileBlocks = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const block of fileBlocks) {
    const lines = block.split('\n');
    const headerMatch = lines[0].match(/a\/(.+?)\s+b\/(.+)/);
    const filePath = headerMatch ? headerMatch[2] : 'unknown';

    let status: 'modified' | 'added' | 'deleted' | 'renamed' = 'modified';
    if (block.includes('new file mode')) status = 'added';
    else if (block.includes('deleted file mode')) status = 'deleted';
    else if (block.includes('rename from')) status = 'renamed';

    const hunks: GitDiffHunk[] = [];
    let currentHunk: GitDiffHunk | null = null;
    let addedCount = 0;
    let deletedCount = 0;

    for (const line of lines) {
      const hunkHeader = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
      if (hunkHeader) {
        if (currentHunk) hunks.push(currentHunk);
        currentHunk = {
          oldStart: parseInt(hunkHeader[1], 10),
          oldLines: hunkHeader[2] ? parseInt(hunkHeader[2], 10) : 1,
          newStart: parseInt(hunkHeader[3], 10),
          newLines: hunkHeader[4] ? parseInt(hunkHeader[4], 10) : 1,
          header: line,
          lines: []
        };
      } else if (currentHunk) {
        currentHunk.lines.push(line);
        if (line.startsWith('+') && !line.startsWith('+++')) addedCount++;
        if (line.startsWith('-') && !line.startsWith('---')) deletedCount++;
      }
    }
    if (currentHunk) hunks.push(currentHunk);

    fileDiffs.push({
      filePath,
      status,
      hunks,
      rawDiff: `diff --git ${block}`,
      addedCount,
      deletedCount
    });
  }

  return fileDiffs;
}

/**
 * Retrieves the local Git diff and working tree state.
 */
export async function getLocalGitDiff(repoPath?: string): Promise<GitRepoState> {
  try {
    const cwdArgs = repoPath ? ['-C', repoPath] : [];

    // Get current branch
    let currentBranch = 'main';
    try {
      const branchCmd = Command.create('git', [...cwdArgs, 'branch', '--show-current']);
      const branchOut = await branchCmd.execute();
      if (branchOut.code === 0 && branchOut.stdout.trim()) {
        currentBranch = branchOut.stdout.trim();
      }
    } catch (e) {
      // Fallback
    }

    // Get status porcelain
    const stagedFiles: string[] = [];
    const unstagedFiles: string[] = [];
    const untrackedFiles: string[] = [];

    try {
      const statusCmd = Command.create('git', [...cwdArgs, 'status', '--porcelain']);
      const statusOut = await statusCmd.execute();
      if (statusOut.code === 0 && statusOut.stdout) {
        const lines = statusOut.stdout.split('\n').filter(Boolean);
        for (const l of lines) {
          const indexCode = l[0];
          const workTreeCode = l[1];
          const file = l.substring(3).trim();

          if (indexCode === '?' && workTreeCode === '?') untrackedFiles.push(file);
          else {
            if (indexCode !== ' ' && indexCode !== '?') stagedFiles.push(file);
            if (workTreeCode !== ' ' && workTreeCode !== '?') unstagedFiles.push(file);
          }
        }
      }
    } catch (e) {}

    // Get diff against HEAD
    let rawDiff = '';
    try {
      const diffCmd = Command.create('git', [...cwdArgs, 'diff', 'HEAD']);
      const diffOut = await diffCmd.execute();
      if (diffOut.code === 0 && diffOut.stdout) {
        rawDiff = diffOut.stdout;
      }
    } catch (e) {}

    // If diff is empty (clean working tree or non-modified repo)
    if (!rawDiff || !rawDiff.trim()) {
      return {
        currentBranch,
        stagedFiles,
        unstagedFiles,
        untrackedFiles,
        fileDiffs: [],
        rawDiff: ''
      };
    }

    const fileDiffs = parseRawGitDiff(rawDiff);

    return {
      currentBranch,
      stagedFiles,
      unstagedFiles,
      untrackedFiles,
      fileDiffs,
      rawDiff
    };
  } catch (err) {
    console.warn('Git inspection error:', err);
    return {
      currentBranch: 'main',
      stagedFiles: [],
      unstagedFiles: [],
      untrackedFiles: [],
      fileDiffs: [],
      rawDiff: ''
    };
  }
}
