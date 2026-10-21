import React, { useEffect, useRef, useState } from 'react';
import { Project, PromptType } from '../types';
import { AiModelOption } from '../constants/models';
import { TAG_PATTERN } from '../constants/tags';
import { X, Settings, Folder, Tags, Bot, Plus, Pencil, Trash2, Check, Upload, Download, RefreshCw, FileArchive } from 'lucide-react';
import { Cloud } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type SettingsTab = 'collections' | 'tags' | 'models' | 'drive';

interface SettingsModalProps {
  projects: Project[];
  tags: string[];
  models: AiModelOption[];
  onClose: () => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onUpdateTags: (tags: string[]) => void;
  onUpdateModels: (models: AiModelOption[]) => void;
  onExportPrompts: () => Promise<void>;
  onImportPrompts: (file: File) => Promise<void>;
  cloudBusy: boolean;
  cloudMessage: string;
  initialTab?: SettingsTab;
  isPage?: boolean;
}

const typeOptions: Array<[PromptType, string]> = [['TXT_TO_TXT', 'TXT â†’ TXT'], ['TXT_TO_IMG', 'TXT â†’ IMG'], ['IMG_TO_IMG', 'IMG â†’ IMG']];

const SettingsModal: React.FC<SettingsModalProps> = ({ projects, tags, models, onClose, onAddProject, onEditProject, onDeleteProject, onUpdateTags, onUpdateModels, onExportPrompts, onImportPrompts, cloudBusy, cloudMessage, initialTab = 'collections', isPage = false }) => {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const { isGoogleUser, driveAccessToken, connectGoogleDrive, loginWithGoogle } = useAuth();
  const [newTag, setNewTag] = useState('');
  const [tagError, setTagError] = useState('');
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [modelDraft, setModelDraft] = useState<AiModelOption | null>(null);
  const [newModel, setNewModel] = useState({ name: '', provider: '', icon: '', promptTypes: ['TXT_TO_TXT'] as PromptType[] });
  const [iconError, setIconError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPage) dialogRef.current?.focus();
  }, [isPage]);

  const readIconFile = (file: File, onRead: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) { setIconError('Please choose an image file.'); return; }
    if (file.size > 1024 * 1024) { setIconError('Icon files must be 1 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onload = () => { onRead(String(reader.result)); setIconError(''); };
    reader.onerror = () => setIconError('Unable to read that icon file.');
    reader.readAsDataURL(file);
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!TAG_PATTERN.test(tag)) { setTagError('Use lowercase letters, numbers, hyphens, or underscores only.'); return; }
    if (!tags.includes(tag)) onUpdateTags([...tags, tag]);
    setNewTag(''); setTagError('');
  };

  const toggleModelType = (type: PromptType) => setNewModel(current => ({ ...current, promptTypes: current.promptTypes.includes(type) ? current.promptTypes.filter(item => item !== type) : [...current.promptTypes, type] }));
  const addModel = () => {
    if (!newModel.name.trim() || !newModel.provider.trim() || !newModel.promptTypes.length) return;
    const id = `custom-${crypto.randomUUID()}`;
    onUpdateModels([...models, { ...newModel, id, name: newModel.name.trim(), provider: newModel.provider.trim(), icon: newModel.icon.trim() || 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg' }]);
    setNewModel({ name: '', provider: '', icon: '', promptTypes: ['TXT_TO_TXT'] });
  };

  return (
    <div className={isPage ? 'min-h-full' : 'fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-6'} onMouseDown={event => { if (!isPage && event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role={isPage ? undefined : 'dialog'} aria-modal={isPage ? undefined : true} tabIndex={isPage ? undefined : -1} className={`flex w-full flex-col overflow-hidden bg-white outline-none dark:bg-slate-900 ${isPage ? 'min-h-[calc(100vh-2rem)] rounded-3xl border border-secondary-200 shadow-sm dark:border-slate-800' : 'max-h-[94vh] max-w-5xl rounded-3xl shadow-2xl'}`}>
        <header className="flex items-center justify-between border-b border-secondary-200 px-5 py-4 dark:border-slate-800 sm:px-7"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary-100 p-2 text-primary-600 dark:bg-primary-950/50 dark:text-primary-300"><Settings className="h-5 w-5" /></span><div><h2 className="text-xl font-bold text-secondary-900 dark:text-white">Settings</h2><p className="text-xs text-secondary-500 dark:text-slate-400">Manage your workspace</p></div></div><button onClick={onClose} className="rounded-xl p-2 text-secondary-500 hover:bg-secondary-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Close settings"><X className="h-5 w-5" /></button></header>
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="settings-tabs flex shrink-0 gap-1 overflow-x-auto border-b border-secondary-200 p-3 dark:border-slate-800 sm:w-52 sm:flex-col sm:border-b-0 sm:border-r sm:p-4">{([['collections', 'Categories', Folder], ['tags', 'Tags', Tags], ['models', 'AI Models', Bot], ['drive', 'Cloud', Cloud]] as const).map(([key, label, Icon]) => <button key={key} onClick={() => setTab(key)} aria-label={label} title={label} className={`settings-tab flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${tab === key ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' : 'text-secondary-600 hover:bg-secondary-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon className="h-5 w-5" aria-hidden="true" /><span className="settings-tab-label">{label}</span></button>)}</nav>
          <main className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
            {tab === 'collections' && <section><div className="mb-5 flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Categories</h3><p className="mt-1 text-sm text-secondary-500 dark:text-slate-400">Organize prompts into focused categories.</p></div><button onClick={onAddProject} className="btn-primary inline-flex items-center gap-1.5 text-sm"><Plus className="h-4 w-4" />Add category</button></div><div className="space-y-2">{projects.map(project => <div key={project.id} className="flex items-center gap-3 rounded-2xl border border-secondary-200 p-3 dark:border-slate-800"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} /><span className="min-w-0 flex-1 truncate text-sm font-medium text-secondary-800 dark:text-slate-200">{project.name}</span><button onClick={() => onEditProject(project)} className="rounded-lg p-2 text-secondary-500 hover:bg-secondary-100 dark:text-slate-400 dark:hover:bg-slate-800" title="Edit category"><Pencil className="h-4 w-4" /></button><button onClick={() => onDeleteProject(project.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" title="Delete category"><Trash2 className="h-4 w-4" /></button></div>)}{!projects.length && <p className="rounded-2xl border border-dashed border-secondary-300 p-8 text-center text-sm text-secondary-500 dark:border-slate-700 dark:text-slate-400">No categories yet.</p>}</div></section>}

            {tab === 'tags' && <section><div className="mb-5"><h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Tags</h3><p className="mt-1 text-sm text-secondary-500 dark:text-slate-400">Add, rename, or remove lowercase tags.</p></div><div className="mb-5 flex flex-col gap-2 sm:flex-row"><input value={newTag} onChange={event => { setNewTag(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')); setTagError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} className="input-field" placeholder="new-tag" /><button onClick={addTag} className="btn-primary inline-flex items-center justify-center gap-1.5 sm:w-auto"><Plus className="h-4 w-4" />Add tag</button></div>{tagError && <p className="mb-4 text-xs text-red-600 dark:text-red-300">{tagError}</p>}<div className="flex flex-wrap gap-2">{tags.map(tag => <span key={tag} className="group inline-flex items-center gap-1 rounded-full bg-secondary-100 px-3 py-2 text-sm text-secondary-700 dark:bg-slate-800 dark:text-slate-200">#{tag}<button onClick={() => onUpdateTags(tags.filter(item => item !== tag))} className="ml-1 text-secondary-400 hover:text-red-500" aria-label={`Delete ${tag}`}><X className="h-3.5 w-3.5" /></button></span>)}</div></section>}

            {tab === 'models' && <section><div className="mb-5"><h3 className="text-lg font-semibold text-secondary-900 dark:text-white">AI Models</h3><p className="mt-1 text-sm text-secondary-500 dark:text-slate-400">Rename, edit compatibility, delete, or add tested models.</p></div>{iconError && <p className="mb-3 text-xs text-red-600 dark:text-red-300">{iconError}</p>}<div className="space-y-2">{models.map(model => editingModel === model.id && modelDraft ? <div key={model.id} className="rounded-2xl border border-primary-300 bg-primary-50/50 p-4 dark:border-primary-800 dark:bg-primary-950/20"><div className="grid gap-3 sm:grid-cols-2"><input value={modelDraft.name} onChange={event => setModelDraft({ ...modelDraft, name: event.target.value })} className="input-field" placeholder="Model name" /><input value={modelDraft.provider} onChange={event => setModelDraft({ ...modelDraft, provider: event.target.value })} className="input-field" placeholder="Provider" /></div><div className="mt-3 flex flex-wrap items-center gap-3"><img src={modelDraft.icon} alt="Current model icon" className="h-10 w-10 rounded-lg bg-white p-1 object-contain dark:bg-slate-900" /><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary-300 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/40"><Upload className="h-4 w-4" />Upload icon<input type="file" accept="image/*" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) readIconFile(file, icon => setModelDraft({ ...modelDraft, icon })); }} /></label><input value={modelDraft.icon.startsWith('data:') ? '' : modelDraft.icon} onChange={event => setModelDraft({ ...modelDraft, icon: event.target.value })} className="input-field min-w-0 flex-1" placeholder="Or paste mono icon URL" /></div><div className="mt-3 flex flex-wrap gap-2">{typeOptions.map(([type, label]) => <button key={type} onClick={() => setModelDraft({ ...modelDraft, promptTypes: modelDraft.promptTypes.includes(type) ? modelDraft.promptTypes.filter(item => item !== type) : [...modelDraft.promptTypes, type] })} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${modelDraft.promptTypes.includes(type) ? 'border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' : 'border-secondary-200 text-secondary-500 dark:border-slate-700 dark:text-slate-400'}`}>{label}</button>)}</div><div className="mt-3 flex justify-end gap-2"><button onClick={() => { setEditingModel(null); setModelDraft(null); }} className="btn-secondary text-sm">Cancel</button><button onClick={() => { onUpdateModels(models.map(item => item.id === model.id ? modelDraft : item)); setEditingModel(null); setModelDraft(null); }} className="btn-primary inline-flex items-center gap-1.5 text-sm"><Check className="h-4 w-4" />Save</button></div></div> : <div key={model.id} className="flex items-center gap-3 rounded-2xl border border-secondary-200 p-3 dark:border-slate-800"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-50 p-1.5 dark:bg-slate-800"><img src={model.icon} alt="" className="h-full w-full object-contain" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-secondary-800 dark:text-slate-200">{model.name}</span><span className="block truncate text-xs text-secondary-500 dark:text-slate-400">{model.provider} Â· {model.promptTypes.map(type => type.replace('_TO_', ' â†’ ')).join(', ')}</span></span><button onClick={() => { setEditingModel(model.id); setModelDraft(model); setIconError(''); }} className="rounded-lg p-2 text-secondary-500 hover:bg-secondary-100 dark:text-slate-400 dark:hover:bg-slate-800" title="Edit model"><Pencil className="h-4 w-4" /></button><button onClick={() => onUpdateModels(models.filter(item => item.id !== model.id))} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" title="Delete model"><Trash2 className="h-4 w-4" /></button></div>)}</div><div className="mt-6 rounded-2xl border border-dashed border-secondary-300 p-4 dark:border-slate-700"><h4 className="font-semibold text-secondary-900 dark:text-white">Add new AI model</h4><div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={newModel.name} onChange={event => setNewModel({ ...newModel, name: event.target.value })} className="input-field" placeholder="Model name" /><input value={newModel.provider} onChange={event => setNewModel({ ...newModel, provider: event.target.value })} className="input-field" placeholder="Provider" /><input value={newModel.icon.startsWith('data:') ? '' : newModel.icon} onChange={event => setNewModel({ ...newModel, icon: event.target.value })} className="input-field" placeholder="Mono icon URL (optional)" /><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary-300 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/40"><Upload className="h-4 w-4" />Upload icon<input type="file" accept="image/*" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) readIconFile(file, icon => setNewModel({ ...newModel, icon })); }} /></label></div><div className="mt-3 flex flex-wrap gap-2">{typeOptions.map(([type, label]) => <button key={type} onClick={() => toggleModelType(type)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${newModel.promptTypes.includes(type) ? 'border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' : 'border-secondary-200 text-secondary-500 dark:border-slate-700 dark:text-slate-400'}`}>{label}</button>)}</div><button onClick={addModel} disabled={!newModel.name.trim() || !newModel.provider.trim() || !newModel.promptTypes.length} className="btn-primary mt-4 inline-flex items-center gap-1.5 text-sm"><Plus className="h-4 w-4" />Add model</button></div></section>}

            {tab === 'drive' && <section><div className="mb-5"><h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Cloud workspace</h3><p className="mt-1 text-sm text-secondary-500 dark:text-slate-400">Sync image attachments with Google Drive and move your prompts between workspaces.</p></div><div className="space-y-4"><div className="rounded-2xl border border-secondary-200 p-5 dark:border-slate-800"><div className="flex items-start gap-3"><span className="rounded-xl bg-primary-100 p-3 text-primary-600 dark:bg-primary-950/50 dark:text-primary-300"><Cloud className="h-6 w-6" /></span><div className="min-w-0 flex-1"><h4 className="font-semibold text-secondary-900 dark:text-white">{driveAccessToken ? 'Google Drive connected' : 'Google Drive not connected'}</h4><p className="mt-1 text-sm text-secondary-500 dark:text-slate-400">{isGoogleUser ? 'New image attachments are synced to your private On Prompt folder.' : 'Google sign-in is required before Drive can be connected.'}</p><button onClick={isGoogleUser ? connectGoogleDrive : loginWithGoogle} className="btn-primary mt-4 inline-flex items-center gap-2" disabled={cloudBusy}><RefreshCw className={`h-4 w-4 ${cloudBusy ? 'animate-spin' : ''}`} />{driveAccessToken ? 'Reconnect Google Drive' : isGoogleUser ? 'Connect Google Drive' : 'Sign in with Google'}</button></div></div></div><div className="rounded-2xl border border-secondary-200 p-5 dark:border-slate-800"><div className="flex items-start gap-3"><span className="rounded-xl bg-secondary-100 p-3 text-secondary-600 dark:bg-slate-800 dark:text-slate-300"><FileArchive className="h-6 w-6" /></span><div className="min-w-0 flex-1"><h4 className="font-semibold text-secondary-900 dark:text-white">Prompt packs</h4><p className="mt-1 text-sm text-secondary-500 dark:text-slate-400">Export every prompt version as Markdown. Image prompts include their reference and result images in organized folders.</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={onExportPrompts} className="btn-primary inline-flex items-center gap-2" disabled={cloudBusy}><Download className="h-4 w-4" />Export all prompts</button><label className={`btn-secondary inline-flex cursor-pointer items-center gap-2 ${cloudBusy ? 'pointer-events-none opacity-60' : ''}`}><Upload className="h-4 w-4" />Import ZIP pack<input type="file" accept=".zip,application/zip" className="sr-only" disabled={cloudBusy} onChange={event => { const file = event.target.files?.[0]; if (file) onImportPrompts(file); event.currentTarget.value = ''; }} /></label></div>{cloudMessage && <p className="mt-3 text-sm text-secondary-600 dark:text-slate-300" role="status">{cloudMessage}</p>}</div></div></div></div></section>}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
