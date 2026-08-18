import type { RAGChunk } from './vaultdoc';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  thinkingDuration?: string;
  citations?: RAGChunk[];
}

export interface ChatSession {
  id: string;
  title: string;
  projectId: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  isArchived?: boolean;
  messages: ChatMessage[];
}

export interface WorkspaceProject {
  id: string;
  name: string;
  path?: string;
}

const SESSIONS_STORAGE_KEY = 'vaultdoc_chat_sessions';
const ACTIVE_SESSION_KEY = 'vaultdoc_active_session_id';
const PROJECTS_STORAGE_KEY = 'vaultdoc_workspace_projects';
const ACTIVE_PROJECT_KEY = 'vaultdoc_active_project_id';

export function getStoredProjects(): WorkspaceProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p: WorkspaceProject) => p && p.id !== 'DATADUKAN_PRO' && p.id !== 'EVO_RETAIL');
  } catch {
    return [];
  }
}

export function saveStoredProjects(projects: WorkspaceProject[]) {
  try {
    const filtered = projects.filter(p => p.id !== 'DATADUKAN_PRO' && p.id !== 'EVO_RETAIL');
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('vaultdoc_projects_change'));
  } catch (err) {
    console.error('Failed to save projects', err);
  }
}

export function getStoredActiveProject(): string {
  try {
    const raw = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (raw === 'DATADUKAN_PRO' || raw === 'EVO_RETAIL') return '';
    return raw || '';
  } catch {
    return '';
  }
}

export function saveStoredActiveProject(projectId: string) {
  try {
    if (projectId && projectId !== 'DATADUKAN_PRO' && projectId !== 'EVO_RETAIL') {
      localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
    window.dispatchEvent(new Event('vaultdoc_projects_change'));
  } catch (err) {
    console.error('Failed to save active project', err);
  }
}

export function getStoredChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Sanitize any legacy copied strings or dummy project associations
    return parsed.map((s: ChatSession, idx: number) => {
      let updatedProjectId = s.projectId;
      if (updatedProjectId === 'DATADUKAN_PRO' || updatedProjectId === 'EVO_RETAIL') {
        updatedProjectId = '';
      }

      if (s.title && s.title.toLowerCase().startsWith('respond to greeting')) {
        const fallbackTitles = [
          'AST Workspace Overview',
          'Codebase Ingestion Q&A',
          'Architecture Discovery',
          'Symbol Flow Inspection'
        ];
        return {
          ...s,
          projectId: updatedProjectId,
          title: fallbackTitles[idx % fallbackTitles.length]
        };
      }
      return {
        ...s,
        projectId: updatedProjectId
      };
    });
  } catch {
    return [];
  }
}

export function saveStoredChatSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event('vaultdoc_sessions_change'));
  } catch (err) {
    console.error('Failed to save chat sessions', err);
  }
}

export function renameChatSession(sessionId: string, newTitle: string) {
  const sessions = getStoredChatSessions();
  const updated = sessions.map(s => s.id === sessionId ? { ...s, title: newTitle.trim() || s.title, updatedAt: Date.now() } : s);
  saveStoredChatSessions(updated);
}

export function togglePinChatSession(sessionId: string): boolean {
  const sessions = getStoredChatSessions();
  let isNowPinned = false;
  const updated = sessions.map(s => {
    if (s.id === sessionId) {
      isNowPinned = !s.isPinned;
      return { ...s, isPinned: isNowPinned, updatedAt: Date.now() };
    }
    return s;
  });
  saveStoredChatSessions(updated);
  return isNowPinned;
}

export function archiveChatSession(sessionId: string) {
  const sessions = getStoredChatSessions();
  const updated = sessions.map(s => s.id === sessionId ? { ...s, isArchived: true, updatedAt: Date.now() } : s);
  saveStoredChatSessions(updated);
}

export function unarchiveChatSession(sessionId: string) {
  const sessions = getStoredChatSessions();
  const updated = sessions.map(s => s.id === sessionId ? { ...s, isArchived: false, updatedAt: Date.now() } : s);
  saveStoredChatSessions(updated);
}

export function moveChatSessionToProject(sessionId: string, newProjectId: string) {
  const sessions = getStoredChatSessions();
  const updated = sessions.map(s => s.id === sessionId ? { ...s, projectId: newProjectId, updatedAt: Date.now() } : s);
  saveStoredChatSessions(updated);
}

export function deleteChatSession(sessionId: string) {
  const sessions = getStoredChatSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  saveStoredChatSessions(filtered);
  if (getStoredActiveSessionId() === sessionId) {
    saveStoredActiveSessionId(null);
  }
}

export function forkChatSession(sessionId: string): ChatSession | null {
  const sessions = getStoredChatSessions();
  const source = sessions.find(s => s.id === sessionId);
  if (!source) return null;

  const forked: ChatSession = {
    ...source,
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: `${source.title} (Fork)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPinned: false,
    messages: source.messages.map(m => ({
      ...m,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    }))
  };
  saveStoredChatSessions([forked, ...sessions]);
  return forked;
}

export function getStoredActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveStoredActiveSessionId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
    window.dispatchEvent(new Event('vaultdoc_sessions_change'));
  } catch (err) {
    console.error('Failed to save active session ID', err);
  }
}

export function generateSessionTitle(prompt: string, existingCount: number = 0): string {
  const trimmed = prompt.trim();
  if (!trimmed) return 'Codebase Session';
  
  const lower = trimmed.toLowerCase();

  // Distinctive VaultDoc intent-aware title generation
  if (/^(hi|hello|hey|greetings|help|who are you)/i.test(lower)) {
    const titles = [
      'AST Workspace Overview',
      'Codebase Ingestion Q&A',
      'Architecture Discovery',
      'Symbol Flow Inspection',
      'Local Engine Health Check'
    ];
    const index = existingCount % titles.length;
    const suffix = existingCount >= titles.length ? ` #${Math.floor(existingCount / titles.length) + 1}` : '';
    return `${titles[index]}${suffix}`;
  }

  if (lower.includes('auth') || lower.includes('token') || lower.includes('jwt')) {
    return 'Inspect: Auth Flow & Middleware';
  }
  if (lower.includes('order') || lower.includes('router') || lower.includes('route')) {
    return 'Inspect: OrderRouter Endpoints';
  }
  if (lower.includes('diff') || lower.includes('git') || lower.includes('pr') || lower.includes('review')) {
    return 'Audit: Pre-PR Shift-Left Diff';
  }
  if (lower.includes('test') || lower.includes('vitest') || lower.includes('pytest')) {
    return 'Generate: Function Test Suites';
  }
  if (lower.includes('spec') || lower.includes('doc') || lower.includes('markdown')) {
    return 'Synthesize: AST Ticket Spec';
  }
  if (lower.includes('arch') || lower.includes('schema') || lower.includes('database')) {
    return 'Analyze: Architecture Data Flow';
  }

  // Clean custom prompt snippet
  const cleaned = trimmed.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
  if (cleaned.length <= 30) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned.slice(0, 28).trim() + '...';
}
