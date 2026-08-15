export interface GitHubConfig {
  pat: string;
  repoFullName: string; // e.g. "owner/repo"
  defaultBranch: string;
}

const STORAGE_KEY = 'vaultdoc_github_config';

export function getStoredGitHubConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    pat: '',
    repoFullName: '',
    defaultBranch: 'main'
  };
}

export function saveGitHubConfig(config: GitHubConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('vaultdoc_github_config_change', { detail: config }));
  } catch (e) {}
}

export interface CreatePRParams {
  title: string;
  body: string;
  headBranch: string;
  baseBranch?: string;
  isDraft?: boolean;
}

export interface PullRequestResponse {
  id: number;
  number: number;
  html_url: string;
  title: string;
  state: string;
  created_at: string;
}

/**
 * Fetches real branches from GitHub REST API using the local PAT.
 */
export async function fetchGitHubBranches(customConfig?: GitHubConfig): Promise<string[]> {
  const config = customConfig || getStoredGitHubConfig();
  if (!config.pat || !config.repoFullName || !config.repoFullName.includes('/')) {
    return [];
  }

  const [owner, repo] = config.repoFullName.split('/');
  const url = `https://api.github.com/repos/${owner.trim()}/${repo.trim()}/branches?per_page=50`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${config.pat.trim()}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map((b: any) => b.name).filter(Boolean);
    }
  } catch (e) {
    console.warn('Failed to fetch GitHub branches:', e);
  }
  return [];
}

/**
 * Creates a GitHub Pull Request directly from the client using the local PAT.
 * Air-gapped: zero intermediary cloud proxies.
 */
export async function createGitHubPullRequest(params: CreatePRParams): Promise<PullRequestResponse> {
  const config = getStoredGitHubConfig();
  
  if (!config.pat || !config.pat.trim()) {
    throw new Error('GitHub Fine-Grained Personal Access Token (PAT) is not configured. Please add it in Settings [⚙️].');
  }

  if (!config.repoFullName || !config.repoFullName.includes('/')) {
    throw new Error('Invalid repository name format. Expected "owner/repo" in Settings [⚙️].');
  }

  const [owner, repo] = config.repoFullName.split('/');
  const baseBranch = params.baseBranch || config.defaultBranch || 'main';

  const url = `https://api.github.com/repos/${owner.trim()}/${repo.trim()}/pulls`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.pat.trim()}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: params.title,
      body: params.body,
      head: params.headBranch,
      base: baseBranch,
      draft: Boolean(params.isDraft)
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const errMsg = data.message || `GitHub API error: ${response.status} ${response.statusText}`;
    const errors = data.errors ? data.errors.map((e: any) => e.message).join(', ') : '';
    throw new Error(`${errMsg} ${errors}`.trim());
  }

  return {
    id: data.id,
    number: data.number,
    html_url: data.html_url,
    title: data.title,
    state: data.state,
    created_at: data.created_at
  };
}
