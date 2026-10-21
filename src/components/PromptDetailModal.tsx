import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Prompt, PromptAttachment, PromptVariants } from '../types';
import { X, Copy, Heart, Edit, ExternalLink, Image as ImageIcon, Sparkles, List, Braces, Indent, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadDriveImage } from '../services/googleDriveService';
import { getAiModels } from '../constants/models';
import StructuredPromptFields from './StructuredPromptFields';

interface PromptDetailModalProps {
  prompt: Prompt;
  onClose: () => void;
  onCopy: (prompt: Prompt, content?: string) => void;
  onToggleFavorite: (promptId: string) => void;
  onEdit: (prompt: Prompt) => void;
}

const PromptDetailModal: React.FC<PromptDetailModalProps> = ({ prompt, onClose, onCopy, onToggleFavorite, onEdit }) => {
  const { driveAccessToken } = useAuth();
  const [imageItems, setImageItems] = useState<Array<{ attachment: PromptAttachment; url: string }>>([]);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const attachments = useMemo(() => prompt.attachments || [], [prompt.attachments]);
  const promptType = (prompt.promptType || 'TXT_TO_TXT').replace('_TO_', ' â†’ ');
  const hasImagePreview = prompt.promptType === 'IMG_TO_IMG' || prompt.promptType === 'TXT_TO_IMG';
  const testedModels = getAiModels(prompt.testedModels?.length ? prompt.testedModels : prompt.testedModel ? [prompt.testedModel] : []);
  const promptVariants: PromptVariants = prompt.promptVariants || {
    general: prompt.promptFormat === 'general' || !prompt.promptFormat ? prompt.content : '',
    json: prompt.promptFormat === 'json' ? prompt.content : '',
    structured: prompt.promptFormat === 'structured' ? prompt.content : '',
  };
  const [activeVariant, setActiveVariant] = useState<keyof PromptVariants>(() => {
    if (prompt.promptFormat && promptVariants[prompt.promptFormat]) return prompt.promptFormat;
    return (['general', 'json', 'structured'] as const).find(key => Boolean(promptVariants[key])) || 'general';
  });
  const variantOptions = [
    ['general', 'General', List, 'General prompt'],
    ['json', 'Json', Braces, 'JSON prompt'],
    ['structured', 'Structured', Indent, 'Structured prompt'],
  ] as const;
  const activeImage = imageItems[slideIndex] || imageItems[0];

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    let active = true;
    if (!driveAccessToken || !attachments.length) { setImageItems([]); return () => undefined; }
    Promise.all(attachments.map(async attachment => {
      try { return { attachment, url: await loadDriveImage(attachment.driveFileId, driveAccessToken) }; }
      catch { return null; }
    })).then(items => {
      if (active) setImageItems(items.filter((item): item is { attachment: PromptAttachment; url: string } => Boolean(item)));
    });
    return () => {
      active = false;
    };
  }, [attachments, driveAccessToken]);

  useEffect(() => {
    setSlideIndex(0);
    setSlideshowOpen(false);
  }, [prompt.id]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const guideItems = [
    { title: 'Use cases', body: prompt.promptType === 'TXT_TO_TXT' ? 'Writing, planning, research, and everyday AI workflows.' : 'Creative image workflows, mood boards, social content, and visual exploration.' },
    { title: 'Best for', body: prompt.tags?.length ? `A focused workflow around ${prompt.tags.slice(0, 3).join(', ')}.` : 'Anyone who wants a reusable prompt with a clear starting point.' },
    { title: 'Customize it', body: 'Swap the subject, style, tone, or output requirements while keeping the prompt structure intact.' },
    { title: 'Style notes', body: `${promptType} prompt Â· version ${prompt.version} Â· used ${prompt.usageCount} times.` },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="prompt-detail-title" tabIndex={-1} className="page-enter flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl outline-none dark:bg-slate-900 sm:max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-secondary-200 px-4 py-3 dark:border-slate-800 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-medium text-secondary-500 dark:text-slate-400"><Sparkles className="h-4 w-4 text-primary-500" /> Prompt details</div>
          <button onClick={onClose} className="rounded-xl p-2 text-secondary-500 transition hover:bg-secondary-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Close prompt details"><X className="h-5 w-5" /></button>
        </div>

        <div className={`grid min-h-0 flex-1 overflow-y-auto ${hasImagePreview ? 'lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]' : ''}`}>
          {hasImagePreview && <div className="relative min-h-[280px] bg-secondary-100 dark:bg-slate-950 lg:min-h-[620px]">
            {activeImage ? <img src={activeImage.url} alt={activeImage.attachment.name || prompt.title} className="h-full min-h-[280px] w-full object-contain lg:min-h-[620px]" /> : <div className="flex h-full min-h-[280px] items-center justify-center bg-gradient-to-br from-primary-100 via-indigo-100 to-secondary-100 dark:from-primary-950/60 dark:via-indigo-950/60 dark:to-slate-950"><ImageIcon className="h-16 w-16 text-primary-300 dark:text-primary-700" /></div>}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
            <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3 text-white"><span className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide backdrop-blur">{activeImage?.attachment.role === 'result' ? 'Result Image' : activeImage?.attachment.role === 'reference' ? 'Reference Image' : promptType}</span>{imageItems.length > 0 && <button type="button" onClick={() => setSlideshowOpen(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/50 backdrop-blur transition hover:bg-black/70" aria-label="Magnify images" title="Magnify images"><ZoomIn className="h-5 w-5" /></button>}</div>
            <div className="absolute bottom-5 left-5 right-5 text-white"><p className="text-sm text-white/85">{activeImage?.attachment.name || (attachments.length ? attachments[0].name : 'Reusable prompt workspace')}{imageItems.length > 1 && <span className="ml-2 rounded-full bg-black/50 px-2 py-1 text-xs">{imageItems.length} images</span>}</p><div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-subtle" aria-label="Image thumbnails">{imageItems.map((item, index) => <button key={item.attachment.id} type="button" onClick={() => setSlideIndex(index)} className={`h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-black/40 transition ${index === slideIndex ? 'border-white' : 'border-white/30 hover:border-white/80'}`} aria-label={`View ${item.attachment.role === 'result' ? 'result' : 'reference'} image ${index + 1}`} title={`View image ${index + 1}`}><img src={item.url} alt="" className="h-full w-full object-cover" /></button>)}</div></div>
          </div>}

          <div className="min-w-0 p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h1 id="prompt-detail-title" className="text-2xl font-bold tracking-tight text-secondary-900 dark:text-white sm:text-3xl">{prompt.title}</h1><p className="mt-2 text-sm text-secondary-500 dark:text-slate-400">in {prompt.project} Â· v{prompt.version}</p>{testedModels.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-secondary-500 dark:text-slate-400">Tested on</span>{testedModels.map(model => <span key={model.id} className="inline-flex items-center gap-1.5 rounded-full border border-secondary-200 bg-secondary-50 px-2.5 py-1.5 text-xs font-medium text-secondary-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><img src={model.icon} alt="" className="h-4 w-4 object-contain" /> {model.name}</span>)}</div>}</div>
              <button onClick={() => onToggleFavorite(prompt.id)} aria-label={prompt.isFavorite ? 'Unlike prompt' : 'Like prompt'} title={prompt.isFavorite ? 'Unlike prompt' : 'Like prompt'} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${prompt.isFavorite ? 'border-red-300 bg-red-50 text-red-500 shadow-[0_0_16px_rgba(239,68,68,0.42)] dark:border-red-800 dark:bg-red-950/40 dark:text-red-400' : 'border-secondary-200 text-red-400 hover:border-red-300 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30'}`}><Heart className={`h-5 w-5 ${prompt.isFavorite ? 'fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'text-red-400'}`} /></button>
            </div>

            <section aria-labelledby="prompt-copy-heading" className="mt-7"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 id="prompt-copy-heading" className="text-lg font-semibold text-secondary-900 dark:text-white">Prompt versions</h2><div className="flex items-center gap-2"><button onClick={() => onEdit(prompt)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-secondary-600 hover:bg-secondary-100 dark:text-slate-300 dark:hover:bg-slate-800" title="Edit prompt" aria-label="Edit prompt"><Edit className="h-4 w-4" /></button><button onClick={() => onCopy(prompt, promptVariants[activeVariant])} className="btn-primary inline-flex h-10 w-10 items-center justify-center p-0" title={`Copy ${activeVariant} prompt`} aria-label={`Copy ${activeVariant} prompt`}><Copy className="h-4 w-4" /></button></div></div>{activeVariant === 'structured' ? <div className="rounded-2xl border border-secondary-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950 sm:p-5"><StructuredPromptFields value={promptVariants.structured} readOnly /></div> : <div className={`min-w-0 rounded-2xl border p-4 ${promptVariants[activeVariant] ? 'border-secondary-200 dark:border-slate-700' : 'border-dashed border-secondary-200 opacity-60 dark:border-slate-800'}`}><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-secondary-900 dark:text-white">{variantOptions.find(([key]) => key === activeVariant)?.[1]} Prompt</h3><span className="text-[10px] uppercase tracking-wide text-secondary-400">{promptVariants[activeVariant] ? 'Available' : 'Empty'}</span></div><pre className="max-h-80 min-h-32 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-secondary-700 dark:text-slate-300">{promptVariants[activeVariant] || `No ${activeVariant} prompt added.`}</pre></div>}<div className="mt-3 flex w-full rounded-xl bg-secondary-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Prompt version"><>{variantOptions.map(([key, label, Icon, description]) => <button key={key} type="button" role="tab" aria-selected={activeVariant === key} aria-label={description} title={description} onClick={() => setActiveVariant(key)} className={`flex flex-1 items-center justify-center rounded-lg px-2 py-2.5 transition ${activeVariant === key ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300' : 'text-secondary-500 hover:text-secondary-700 dark:text-slate-400 dark:hover:text-slate-200'}`}><span className="sr-only">{label}</span><Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" /></button>)}</></div></section>

            <section aria-labelledby="prompt-tags-heading" className="mt-6"><h2 id="prompt-tags-heading" className="text-lg font-semibold text-secondary-900 dark:text-white">Tags</h2><div className="mt-3 flex flex-wrap gap-2">{(prompt.tags || []).length ? (prompt.tags || []).map(tag => <span key={tag} className="rounded-full bg-secondary-100 px-3 py-1.5 text-xs font-medium text-secondary-700 dark:bg-slate-800 dark:text-slate-300">#{tag}</span>) : <span className="text-sm text-secondary-500 dark:text-slate-400">No tags added yet.</span>}</div></section>

            <section aria-labelledby="prompt-guide-heading" className="mt-8"><div className="mb-3"><h2 id="prompt-guide-heading" className="text-lg font-semibold text-secondary-900 dark:text-white">Prompt Guide</h2><p className="mt-1 text-sm text-secondary-500 dark:text-slate-400">Practical ways to adapt this prompt in your workflow.</p></div><div className="grid gap-3 sm:grid-cols-2">{guideItems.map(item => <article key={item.title} className="rounded-2xl border border-secondary-200 p-4 dark:border-slate-800"><h3 className="text-sm font-semibold text-secondary-900 dark:text-white">{item.title}</h3><p className="mt-2 text-xs leading-5 text-secondary-500 dark:text-slate-400">{item.body}</p></article>)}</div></section>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-secondary-200 pt-4 text-xs text-secondary-500 dark:border-slate-800 dark:text-slate-400"><span>Updated {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(prompt.updatedAt)}</span><span>Â·</span><span>{prompt.usageCount} prompt uses</span>{attachments[0]?.webViewLink && <a href={attachments[0].webViewLink} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400">Open in Drive <ExternalLink className="h-3.5 w-3.5" /></a>}</div>
          </div>
        </div>
      </div>
      {slideshowOpen && imageItems.length > 0 && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setSlideshowOpen(false); }}><div className="relative flex h-full w-full max-w-6xl items-center justify-center"><button type="button" onClick={() => setSlideshowOpen(false)} className="absolute right-0 top-0 z-10 rounded-xl bg-black/50 p-3 text-white transition hover:bg-black/70" aria-label="Close image slideshow"><X className="h-6 w-6" /></button><div className="absolute left-0 top-0 z-10 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">{imageItems[slideIndex].attachment.role === 'result' ? 'Result Image' : imageItems[slideIndex].attachment.role === 'reference' ? 'Reference Image' : 'Image'}</div><img src={imageItems[slideIndex].url} alt={imageItems[slideIndex].attachment.name || prompt.title} className="max-h-full max-w-full rounded-xl object-contain" />{imageItems.length > 1 && <><button type="button" onClick={() => setSlideIndex(index => (index - 1 + imageItems.length) % imageItems.length)} className="absolute left-0 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70" aria-label="Previous image"><ChevronLeft className="h-7 w-7" /></button><button type="button" onClick={() => setSlideIndex(index => (index + 1) % imageItems.length)} className="absolute right-0 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70" aria-label="Next image"><ChevronRight className="h-7 w-7" /></button><div className="absolute bottom-0 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white">{slideIndex + 1} / {imageItems.length}</div></>}</div></div>}
    </div>
  );
};

export default PromptDetailModal;
