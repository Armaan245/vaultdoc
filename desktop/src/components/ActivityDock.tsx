import { 
  BookOpen,
  MessageSquare, 
  Layers, 
  FileText, 
  ShieldAlert, 
  FlaskConical, 
  GitFork,
  FolderTree
} from 'lucide-react';

export type ActivityTab = 'docs' | 'architecture' | 'chat' | 'spec' | 'audit' | 'tests' | 'git';

interface ActivityDockProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  isFileTreeOpen: boolean;
  onToggleFileTree: () => void;
  hasRepo?: boolean;
}

interface DockItem {
  id: ActivityTab;
  label: string;
  icon: typeof BookOpen;
  tooltip: string;
  badge?: string;
}

const DOCK_ITEMS: DockItem[] = [
  { id: 'docs', label: 'Docs', icon: BookOpen, tooltip: 'Technical Documentation & Specs (📚)' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, tooltip: 'Air-Gapped Codebase Assistant (💬)' },
  { id: 'architecture', label: 'Architecture', icon: Layers, tooltip: 'System Design & Component Flow (🏛️)' },
  { id: 'spec', label: 'Ticket Spec', icon: FileText, tooltip: 'Jira/Linear Ticket Clarifier (📝)' },
  { id: 'audit', label: 'Pre-PR Review', icon: ShieldAlert, tooltip: 'Shift-Left Security & Logic Audit (🔍)', badge: 'AIR' },
  { id: 'tests', label: 'Test Suite', icon: FlaskConical, tooltip: 'Automated AST Unit Tests (🧪)' },
  { id: 'git', label: 'Git / PR', icon: GitFork, tooltip: 'Local-First GitHub PR Client (🐙)' },
];

export const ActivityDock = ({
  activeTab,
  onTabChange,
  isFileTreeOpen,
  onToggleFileTree
}: ActivityDockProps) => {
  return (
    <aside className="w-[56px] flex-shrink-0 h-full bg-[#070c18] border-r border-vault-border/60 flex flex-col justify-between items-center py-3 select-none z-20 print:hidden">
      {/* Top Activity Icons */}
      <div className="flex flex-col items-center gap-2 w-full">
        {DOCK_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
                isActive
                  ? 'bg-[#0f1d35] text-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.2)] border border-[#0284c7]/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1628] border border-transparent'
              }`}
              title={item.tooltip}
              aria-label={item.label}
            >
              {/* Cyan active indicator strip on left */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#38bdf8] rounded-r shadow-[0_0_8px_#38bdf8]" />
              )}
              
              <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-105 stroke-[2.2]' : 'group-hover:scale-105 stroke-[1.8]'}`} />

              {item.badge && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-vault-security text-black text-[7px] font-bold rounded-full">
                  {item.badge}
                </span>
              )}

              {/* Hover Tooltip Floating Pill */}
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#0f172a] text-slate-100 text-xs rounded-md shadow-xl border border-vault-border whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.tooltip}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Utility Controls */}
      <div className="flex flex-col items-center gap-2 w-full pt-2 border-t border-vault-border/40">
        {/* Toggle File Explorer Drawer */}
        <button
          onClick={onToggleFileTree}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative group ${
            isFileTreeOpen
              ? 'bg-[#0f1d35] text-[#38bdf8] border border-[#0284c7]/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1628]'
          }`}
          title={isFileTreeOpen ? 'Hide File Explorer' : 'Show File Explorer'}
        >
          <FolderTree className="w-4 h-4 stroke-[1.8]" />
          <div className="absolute left-full ml-3 px-2 py-1 bg-[#0f172a] text-slate-100 text-xs rounded-md shadow-xl border border-vault-border whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {isFileTreeOpen ? 'Collapse Files' : 'Expand Files'}
          </div>
        </button>
      </div>
    </aside>
  );
};

export default ActivityDock;
