import React, { useState } from 'react';
import { X, Folder, FolderPlus, Trash2, Loader2 } from 'lucide-react';
import { selectRepositoryFolder } from '../services/vaultdoc';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (projectName: string, folderPath?: string) => Promise<void> | void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject
}) => {
  const [projectName, setProjectName] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePickFolder = async () => {
    try {
      setIsSelecting(true);
      const folderPath = await selectRepositoryFolder();
      if (folderPath) {
        setSelectedPath(folderPath);
        if (!projectName.trim()) {
          const folderBaseName = folderPath.split(/[/\\]/).filter(Boolean).pop() || folderPath;
          setProjectName(folderBaseName);
        }
      }
    } catch (err) {
      console.warn('Error selecting folder:', err);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      setIsSubmitting(true);
      await onCreateProject(projectName.trim(), selectedPath || undefined);
      setProjectName('');
      setSelectedPath(null);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Modal Dialog Box */}
      <div 
        className="w-full max-w-[480px] bg-[#222227] border border-white/[0.08] rounded-2xl p-6 shadow-2xl relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium text-white tracking-tight">Create project</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreate}>
          {/* Project Name Input */}
          <div className="relative mb-5">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Folder size={15} />
            </div>
            <input
              type="text"
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full bg-[#18181c] border border-white/[0.08] focus:border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-colors"
            />
          </div>

          {/* Source Folders Section */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Source folders
            </label>

            {selectedPath ? (
              <div className="bg-[#18181c] border border-white/[0.08] rounded-xl p-3.5 flex items-center justify-between group">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Folder size={16} className="text-sky-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-slate-200 truncate">{selectedPath}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPath(null)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1 flex-shrink-0"
                  title="Remove folder"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePickFolder}
                disabled={isSelecting}
                className="w-full bg-[#18181c]/60 hover:bg-[#18181c] border border-white/[0.06] hover:border-white/20 rounded-xl py-6 px-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                {isSelecting ? (
                  <Loader2 size={20} className="text-slate-400 animate-spin mb-2" />
                ) : (
                  <FolderPlus size={22} className="text-slate-400 group-hover:text-white mb-2 transition-colors" />
                )}
                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                  Add folders Codex can read and edit
                </span>
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!projectName.trim() || isSubmitting}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-medium text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-sm flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin text-black" />}
              <span>Create project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
