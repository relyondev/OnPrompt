import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Prompt, Project, Category, PromptAttachment, PromptType, PromptFormat, PromptVariants } from '../types';
import { analyzePrompt, getSuggestionIcon, getPriorityColor } from '../utils/promptAnalysis';
import { X, Plus, Sparkles, List, Smile, Type, Braces, Clipboard, Bold, Indent, Outdent, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Upload, Cloud, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { uploadImageToDrive } from '../services/googleDriveService';
import { isValidTag, normalizeTag } from '../constants/tags';
import { AiModelOption } from '../constants/models';
import StructuredPromptFields from './StructuredPromptFields';

interface PromptFormProps {
  prompt?: Prompt;
  projects: Project[];
  categories: Category[];
  availableTags: string[];
  modelOptions: AiModelOption[];
  onSave: (prompt: Prompt) => void;
  onCancel: () => void;
  onAddProject?: () => void;
  onRequireDrive?: () => void;
}

const LocalImage: React.FC<{ file: File; alt: string; className: string }> = ({ file, alt, className }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  return url ? <img src={url} alt={alt} className={className} /> : null;
};

const PromptForm: React.FC<PromptFormProps> = ({
  prompt,
  projects,
  categories,
  availableTags,
  modelOptions,
  onSave,
  onCancel,
  onAddProject,
  onRequireDrive,
}) => {
  const [formData, setFormData] = useState({
    title: prompt?.title || '',
    content: prompt?.content || prompt?.promptVariants?.general || prompt?.promptVariants?.json || prompt?.promptVariants?.structured || '',
    project: prompt?.project || '',
    category: prompt?.category || '',
  });
  const [promptType, setPromptType] = useState<PromptType>(prompt?.promptType || 'TXT_TO_TXT');
  const [testedModels, setTestedModels] = useState<string[]>(() => {
    if (prompt?.testedModels?.length) return prompt.testedModels;
    if (prompt?.testedModel) return [prompt.testedModel];
    return prompt ? ['openai'] : [];
  });
  const [promptFormat, setPromptFormat] = useState<PromptFormat>(prompt?.promptFormat || 'general');
  const [promptVariants, setPromptVariants] = useState<PromptVariants>(() => ({
    general: prompt?.promptVariants?.general || (prompt?.promptFormat === 'general' || !prompt?.promptFormat ? prompt?.content || '' : ''),
    json: prompt?.promptVariants?.json || (prompt?.promptFormat === 'json' ? prompt?.content || '' : ''),
    structured: prompt?.promptVariants?.structured || (prompt?.promptFormat === 'structured' ? prompt?.content || '' : ''),
  }));
  const [analysis, setAnalysis] = useState(analyzePrompt(formData.content));
  const [activeVariant, setActiveVariant] = useState<keyof PromptVariants>(prompt?.promptFormat || 'general');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [imageFiles, setImageFiles] = useState<{ reference: File[]; result: File[] }>({ reference: [], result: [] });
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [tags, setTags] = useState<string[]>(prompt?.tags || []);
  const [customTag, setCustomTag] = useState('');
  const [tagError, setTagError] = useState('');
  const [pasteError, setPasteError] = useState('');
  const { isGoogleUser, driveAccessToken, connectGoogleDrive } = useAuth();

  // Common emojis for prompts
  const commonEmojis = ['âœ¨', 'ðŸš€', 'ðŸ’¡', 'ðŸŽ¯', 'ðŸ“', 'ðŸ”¥', 'ðŸ’ª', 'â­', 'ðŸŒŸ', 'ðŸŽ¨', 'ðŸ“Š', 'ðŸŽ‰', 'ðŸ”§', 'ðŸ’°', 'ðŸ“ˆ', 'ðŸ†', 'ðŸŽ­', 'ðŸŒˆ', 'âš¡', 'ðŸŒ'];

  useEffect(() => {
    setAnalysis(analyzePrompt(Object.values(promptVariants).filter(Boolean).join('\n\n')));
  }, [formData.content, promptVariants]);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = formData.content || '';
    }
  }, [formData.content]);

  useEffect(() => {
    if (!previewImage) { setPreviewImageUrl(''); return () => undefined; }
    const nextUrl = URL.createObjectURL(previewImage);
    setPreviewImageUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [previewImage]);

  const availableModels = useMemo(() => modelOptions.filter(model => model.promptTypes.includes(promptType)), [modelOptions, promptType]);

  useEffect(() => {
    setTestedModels(current => current.filter(modelId => availableModels.some(model => model.id === modelId)));
  }, [availableModels]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateVariant = (variant: keyof PromptVariants, value: string) => {
    setPromptVariants(prev => ({ ...prev, [variant]: value }));
    setFormData(prev => ({ ...prev, content: variant === 'general' ? value : (prev.content || value) }));
    setPasteError('');
  };

  const updateContent = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerText || editorRef.current.textContent || '';
      handleInputChange('content', content);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        setPasteError('Your clipboard is empty.');
        return;
      }
      updateVariant(activeVariant, clipboardText);
      setPasteError('');
    } catch {
      setPasteError('Clipboard access was blocked. Please allow clipboard access or use Ctrl/Cmd + V.');
    }
  };

  const insertAtCursor = (text: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // If no selection, append to the end
      const currentText = editor.innerText || editor.textContent || '';
      editor.innerText = currentText + text;
      // Set cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    updateContent();
  };

  const addBulletPoint = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const bulletText = document.createTextNode('â€¢ ');
      range.insertNode(bulletText);
      range.setStartAfter(bulletText);
      range.setEndAfter(bulletText);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      insertAtCursor('â€¢ ');
    }
    updateContent();
  };

  const addNumberedList = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const numberedText = document.createTextNode('1. ');
      range.insertNode(numberedText);
      range.setStartAfter(numberedText);
      range.setEndAfter(numberedText);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      insertAtCursor('1. ');
    }
    updateContent();
  };

  const addEmoji = (emoji: string) => {
    insertAtCursor(emoji);
  };

  const toggleBold = () => {
    document.execCommand('bold', false);
    setIsBold(!isBold);
    updateContent();
  };

  const toggleItalic = () => {
    document.execCommand('italic', false);
    setIsItalic(!isItalic);
    updateContent();
  };

  const toggleUnderline = () => {
    document.execCommand('underline', false);
    setIsUnderline(!isUnderline);
    updateContent();
  };

  const increaseIndent = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      if (container.nodeType === Node.TEXT_NODE) {
        const parent = container.parentNode;
        if (parent && parent.nodeName === 'DIV') {
          const currentStyle = (parent as HTMLElement).style.marginLeft || '0px';
          const currentIndent = parseInt(currentStyle) || 0;
          (parent as HTMLElement).style.marginLeft = `${currentIndent + 20}px`;
        }
      }
    }
    updateContent();
  };

  const decreaseIndent = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      if (container.nodeType === Node.TEXT_NODE) {
        const parent = container.parentNode;
        if (parent && parent.nodeName === 'DIV') {
          const currentStyle = (parent as HTMLElement).style.marginLeft || '0px';
          const currentIndent = parseInt(currentStyle) || 0;
          const newIndent = Math.max(0, currentIndent - 20);
          (parent as HTMLElement).style.marginLeft = `${newIndent}px`;
        }
      }
    }
    updateContent();
  };

  const setTextAlignment = (alignment: 'left' | 'center' | 'right') => {
    document.execCommand('justifyLeft', false);
    if (alignment === 'center') {
      document.execCommand('justifyCenter', false);
    } else if (alignment === 'right') {
      document.execCommand('justifyRight', false);
    }
    setTextAlign(alignment);
    updateContent();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        decreaseIndent();
      } else {
        increaseIndent();
      }
    }
  };

  const toggleTag = (tag: string) => {
    setTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag]);
    setTagError('');
  };

  const addCustomTag = () => {
    const tag = normalizeTag(customTag);
    if (!isValidTag(tag)) {
      setTagError('Use lowercase letters, numbers, hyphens, or underscores only. No spaces.');
      return;
    }
    if (!tags.includes(tag)) setTags(current => [...current, tag]);
    setCustomTag('');
    setTagError('');
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedVariants: PromptVariants = {
      general: promptVariants.general.trim(),
      json: promptVariants.json.trim(),
      structured: promptVariants.structured.trim(),
    };
    const primaryContent = normalizedVariants.general || normalizedVariants.json || normalizedVariants.structured;
    
    if (!formData.title.trim() || !primaryContent || !testedModels.length) {
      if (!primaryContent) setPasteError('Add content to at least one prompt type before saving.');
      return;
    }

    if (normalizedVariants.json) {
      try {
        JSON.parse(normalizedVariants.json);
      } catch {
        setPasteError('Json Prompt content must be valid JSON before it can be saved.');
        return;
      }
    }

    const promptId = prompt?.id || crypto.randomUUID();
    const filesToUpload = (promptType === 'IMG_TO_IMG'
      ? ([['reference', imageFiles.reference], ['result', imageFiles.result]] as const)
      : promptType === 'TXT_TO_IMG'
        ? ([['result', imageFiles.result]] as const)
        : []).flatMap(([role, files]) => files.map(file => [role, file] as const));
    let attachments: PromptAttachment[] = prompt?.attachments || [];
    if (filesToUpload.length) attachments = attachments.filter(attachment => attachment.role !== 'reference' && attachment.role !== 'result');
    if (filesToUpload.length) {
      if (!driveAccessToken) {
        onRequireDrive?.();
        return;
      }
      try {
        setIsUploading(true);
        for (const [role, file] of filesToUpload) {
          if (!file) continue;
          try {
            attachments = [...attachments, { ...(await uploadImageToDrive(file, promptId, driveAccessToken)), role }];
          } catch (error: any) {
            if (error.message.includes('connection expired')) {
              const refreshedToken = await connectGoogleDrive();
              attachments = [...attachments, { ...(await uploadImageToDrive(file, promptId, refreshedToken)), role }];
            } else {
              throw error;
            }
          }
        }
      } catch (error: any) {
        setUploadError(error.message || 'Image upload failed.');
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const updatedPrompt: Prompt = {
      id: promptId,
      title: formData.title.trim(),
      content: primaryContent,
      project: formData.project || 'Uncategorized',
      category: formData.category || 'Uncategorized',
      tags,
      createdAt: prompt?.createdAt || new Date(),
      updatedAt: new Date(),
      version: prompt ? prompt.version + 1 : 1,
      isFavorite: prompt?.isFavorite || false,
      usageCount: prompt?.usageCount || 0,
      attachments,
      promptType,
      promptFormat: normalizedVariants.general ? 'general' : normalizedVariants.json ? 'json' : 'structured',
      promptVariants: normalizedVariants,
      testedModel: testedModels[0],
      testedModels,
    };

    onSave(updatedPrompt);
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl h-full max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col outline-none">
        <div className="p-4 sm:p-6 border-b border-secondary-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white">
              {prompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-secondary-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:gap-6 sm:p-6">
          <div className="hidden">
            <label className="mb-2 block text-sm font-semibold text-secondary-700 dark:text-slate-200">Prompt format *</label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {([['general', 'General Prompt', 'Plain language'], ['json', 'Json Prompt', 'Valid JSON'], ['structured', 'Structured Prompt', 'Organized blocks']] as const).map(([value, label, description]) => (
                <button key={value} type="button" onClick={() => { setPromptFormat(value); setPasteError(''); }} className={`flex min-w-0 items-center justify-center rounded-xl border p-3 text-left transition-all ${promptFormat === value ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20 dark:bg-primary-950/40 dark:text-primary-300' : 'border-secondary-200 text-secondary-600 hover:border-primary-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-700'}`} aria-label={label} title={`${label}: ${description}`}>
                  <span className="sr-only">{label}</span>
                  {value === 'general' ? <List className="h-5 w-5" aria-hidden="true" /> : value === 'json' ? <Type className="h-5 w-5" aria-hidden="true" /> : <Indent className="h-5 w-5" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          <div className="order-7">
            <div className="mb-2 flex items-center justify-between gap-3"><label className="block text-sm font-semibold text-secondary-700 dark:text-slate-200">Tested on *</label><span className="text-xs text-secondary-500 dark:text-slate-400">{availableModels.length} compatible models</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {availableModels.map(model => (
                <button key={model.id} type="button" onClick={() => setTestedModels(current => current.includes(model.id) ? current.filter(id => id !== model.id) : [...current, model.id])} aria-pressed={testedModels.includes(model.id)} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 text-left transition-all ${testedModels.includes(model.id) ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20 dark:bg-primary-950/40 dark:text-primary-300' : 'border-secondary-200 bg-white text-secondary-700 hover:border-primary-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-700'}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-50 p-1.5 dark:bg-slate-800"><img src={model.icon} alt="" className="h-full w-full object-contain" /></span>
                  <span className="min-w-0"><span className="block truncate text-xs font-semibold">{model.name}</span><span className="block truncate text-[10px] text-secondary-500 dark:text-slate-400">{model.provider}</span></span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-secondary-500 dark:text-slate-400">The list changes with your prompt type. Text â†’ text only shows text-capable models; image prompts show visual models.</p>
          </div>

          {/* Title and Category Row */}
          <div className="order-1 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.34fr)] sm:gap-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-slate-200 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="input-field"
                placeholder="Enter prompt title..."
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-secondary-700 dark:text-slate-200">Prompt Type *</label>
              <select value={promptType} onChange={event => { const nextType = event.target.value as PromptType; setPromptType(nextType); if (nextType !== 'IMG_TO_IMG' && nextType !== 'TXT_TO_IMG') setImageFiles({ reference: [], result: [] }); if ((nextType === 'IMG_TO_IMG' || nextType === 'TXT_TO_IMG') && !driveAccessToken) onRequireDrive?.(); }} className="input-field">
                <option value="IMG_TO_IMG">IMG â†’ IMG</option>
                <option value="TXT_TO_IMG">TXT â†’ IMG</option>
                <option value="TXT_TO_TXT">TXT â†’ TXT</option>
              </select>
            </div>
          </div>

          <div className="order-3 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-secondary-700 dark:text-slate-200">Category</label>
              <select value={formData.project} onChange={event => { handleInputChange('project', event.target.value); handleInputChange('category', ''); }} className="input-field"><option value="">Uncategorized</option>{projects.map(project => <option key={project.id} value={project.name}>{project.name}</option>)}</select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-secondary-700 dark:text-slate-200">Sub Category</label>
              <select value={formData.category} onChange={event => handleInputChange('category', event.target.value)} className="input-field" disabled={!formData.project}><option value="">Uncategorized</option>{categories.filter(category => projects.find(project => project.name === formData.project)?.id === category.projectId).map(category => <option key={category.id} value={category.name}>{category.name}</option>)}</select>
            </div>
          </div>

          <div className="order-8 rounded-2xl border border-secondary-200 dark:border-slate-700 bg-secondary-50/70 dark:bg-slate-800/50 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <label className="block text-sm font-semibold text-secondary-800 dark:text-slate-100">Tags</label>
                <p className="text-xs text-secondary-500 dark:text-slate-400 mt-1">Choose a preset or add a lowercase tag.</p>
              </div>
              <span className="text-xs text-secondary-400 dark:text-slate-500">{tags.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${tags.includes(tag) ? 'border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' : 'border-secondary-200 bg-white text-secondary-600 hover:border-primary-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{tag}</button>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={customTag} onChange={event => { setCustomTag(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')); setTagError(''); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addCustomTag(); } }} className="input-field flex-1" placeholder="add-custom-tag" aria-label="Custom tag" />
              <button type="button" onClick={addCustomTag} className="btn-secondary whitespace-nowrap"><Plus className="mr-1 inline h-4 w-4" />Add tag</button>
            </div>
            {tagError && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{tagError}</p>}
            {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{tags.map(tag => <button key={tag} type="button" onClick={() => toggleTag(tag)} className="rounded-full bg-secondary-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-slate-900">#{tag} Ã—</button>)}</div>}
          </div>



          {(promptType === 'IMG_TO_IMG' || promptType === 'TXT_TO_IMG') && <div className="order-4 rounded-2xl border border-secondary-200 bg-secondary-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-3 flex items-center justify-between gap-3"><div><p className="font-semibold text-secondary-900 dark:text-white">{promptType === 'TXT_TO_IMG' ? 'Result image' : 'Image inputs'}</p><p className="mt-0.5 text-xs text-secondary-500 dark:text-slate-400">{promptType === 'TXT_TO_IMG' ? 'Add the result image generated from this prompt.' : 'Reference and result images are stored in your Google Drive.'}</p></div>{isGoogleUser && driveAccessToken ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Drive connected</span> : <button type="button" onClick={onRequireDrive} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"><Cloud className="h-3.5 w-3.5" />Connect in Settings</button>}</div>
            <div className={`grid grid-cols-1 gap-3 ${promptType === 'IMG_TO_IMG' ? 'sm:grid-cols-2' : ''}`}>
              {(promptType === 'IMG_TO_IMG' ? ([['reference', 'Image reference'], ['result', 'Result image']] as const) : ([['result', 'Result image']] as const)).map(([role, label]) => <div key={role} className="min-w-0"><label className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition-colors ${isGoogleUser && driveAccessToken ? 'border-primary-300 bg-white text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:bg-slate-900 dark:text-primary-300' : 'cursor-not-allowed border-secondary-300 text-secondary-400 dark:border-slate-700'}`}><Upload className="mb-2 h-5 w-5" /><span className="text-sm font-semibold">{label}</span><span className="mt-1 max-w-full truncate text-xs text-secondary-500 dark:text-slate-400">{imageFiles[role].length ? `${imageFiles[role].length} image${imageFiles[role].length === 1 ? '' : 's'} selected` : 'Choose image Â· max 10 MB'}</span><input type="file" accept="image/*" multiple className="sr-only" disabled={!isGoogleUser || !driveAccessToken} onChange={event => { setUploadError(''); setImageFiles(current => ({ ...current, [role]: Array.from(event.target.files || []) })); }} /></label>{imageFiles[role].length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label={`${label} thumbnails`}>{imageFiles[role].map(file => <button key={`${file.name}-${file.lastModified}`} type="button" onClick={() => setPreviewImage(file)} className="h-14 w-14 overflow-hidden rounded-xl border border-primary-200 bg-secondary-100 shadow-sm transition hover:scale-105 hover:border-primary-500 dark:border-slate-700 dark:bg-slate-800" title={`Preview ${file.name}`}><LocalImage file={file} alt={file.name} className="h-full w-full object-cover" /></button>)}</div>}</div>)}
            </div>
            {uploadError && <p className="mt-2 text-xs text-red-600 dark:text-red-300">{uploadError}</p>}
          </div>}

          <section className="order-5 space-y-3" aria-labelledby="prompt-variants-heading">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 id="prompt-variants-heading" className="text-sm font-semibold text-secondary-800 dark:text-slate-100">Prompt content</h3>
                <p className="mt-1 text-xs text-secondary-500 dark:text-slate-400">Switch between versions using the toggle. At least one version must contain text.</p>
              </div>
            </div>
            <div className="flex w-full rounded-xl bg-secondary-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Prompt format">
              {([['general', 'General', List, 'General prompt'], ['json', 'Json', Braces, 'JSON prompt'], ['structured', 'Structured', Indent, 'Structured prompt']] as const).map(([variant, label, Icon, description]) => <button key={variant} type="button" role="tab" aria-selected={activeVariant === variant} aria-label={description} title={description} onClick={() => { setActiveVariant(variant); setPromptFormat(variant); setPasteError(''); }} className={`flex flex-1 items-center justify-center rounded-lg px-2 py-2.5 transition ${activeVariant === variant ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300' : 'text-secondary-500 hover:text-secondary-700 dark:text-slate-400 dark:hover:text-slate-200'}`}><span className="sr-only">{label}</span><Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" /></button>)}
            </div>
            {pasteError && <p className="text-xs text-amber-600 dark:text-amber-300">{pasteError}</p>}
            {activeVariant === 'structured' ? <div className="rounded-2xl border border-primary-200 bg-slate-50 p-4 ring-1 ring-primary-500/10 dark:border-slate-700 dark:bg-slate-950 sm:p-5"><StructuredPromptFields value={promptVariants.structured} onChange={value => updateVariant('structured', value)} /></div> : <div className="rounded-2xl border border-primary-200 bg-white p-3 ring-1 ring-primary-500/10 dark:border-slate-700 dark:bg-slate-950 sm:p-4"><div className="mb-2 flex items-center justify-between gap-2"><label htmlFor="active-prompt-content" className="text-sm font-semibold text-secondary-800 dark:text-slate-100">{activeVariant === 'general' ? 'General Prompt' : 'Json Prompt'}</label><span className="text-[10px] text-secondary-400">{promptVariants[activeVariant].length} chars</span></div><textarea id="active-prompt-content" value={promptVariants[activeVariant]} onChange={event => updateVariant(activeVariant, event.target.value)} placeholder={`Enter ${activeVariant} prompt...`} className="min-h-[280px] w-full resize-y rounded-xl border border-secondary-200 bg-secondary-50 p-3 font-mono text-xs leading-5 text-secondary-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:min-h-[360px]" /></div>}
          </section>

          {/* Analysis Panel - Now Above Content */}
          <div className="hidden">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-secondary-700 dark:text-slate-200">Prompt Content *</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={pasteFromClipboard} className="inline-flex items-center gap-1 rounded-lg border border-secondary-200 px-2.5 py-1.5 text-xs font-medium text-secondary-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-primary-950/30" title="Paste from clipboard">
                  <Clipboard className="h-3.5 w-3.5" />
                  Paste
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className={`flex items-center gap-1 text-sm px-3 py-1 rounded-lg transition-all duration-200 ${
                    showAnalysis 
                      ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                      : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${showAnalysis ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">{showAnalysis ? 'Hide Analysis' : 'Show Analysis'}</span>
                </button>
              </div>
            </div>
            {pasteError && <p className="text-xs text-amber-600 dark:text-amber-300">{pasteError}</p>}

            {/* Analysis Panel - Always visible when enabled */}
            {showAnalysis && (
              <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/40 dark:to-indigo-950/40 dark:border-blue-900 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Live Prompt Analysis</h4>
                  <div className="ml-auto text-xs text-blue-600 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/60 px-2 py-1 rounded-full">
                    Real-time
                  </div>
                </div>
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="text-center p-2 sm:p-3 bg-white dark:bg-slate-900/80 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-300">{analysis.wordCount}</div>
                    <div className="text-xs text-blue-700 dark:text-blue-200">Words</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-white dark:bg-slate-900/80 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-300">{analysis.characterCount}</div>
                    <div className="text-xs text-blue-700 dark:text-blue-200">Characters</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-white dark:bg-slate-900/80 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-300">{analysis.readabilityScore}</div>
                    <div className="text-xs text-blue-700 dark:text-blue-200">Readability</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-white dark:bg-slate-900/80 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-300">~{analysis.estimatedTokens}</div>
                    <div className="text-xs text-blue-700 dark:text-blue-200">Est. Tokens</div>
                  </div>
                </div>
                
                {/* Dynamic Suggestions */}
                {analysis.suggestions.length > 0 ? (
                  <div>
                    <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                      <span className="text-lg">ðŸ’¡</span>
                      Smart Suggestions ({analysis.suggestions.length})
                    </h5>
                    <div className="space-y-3">
                      {analysis.suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md ${getPriorityColor(suggestion.priority)} border-l-current`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xl mt-0.5">{getSuggestionIcon(suggestion.type)}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{suggestion.suggestion}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {suggestion.priority} priority
                                </span>
                                <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                                  {suggestion.type} improvement
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-blue-600 dark:text-blue-300">
                    <Sparkles className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Great prompt! No suggestions needed.</p>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Google Docs-style Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-secondary-50 dark:bg-slate-800/70 border border-secondary-200 dark:border-slate-700 rounded-lg">
              <span className="text-sm font-medium text-secondary-700 dark:text-slate-200 mr-2">Format:</span>
              
              {/* Text Formatting */}
              <div className="flex items-center gap-1 border-r border-secondary-300 dark:border-slate-600 pr-2">
                <button
                  type="button"
                  onClick={toggleBold}
                  className={`flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white dark:hover:bg-slate-700 transition-colors ${
                    isBold ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600'
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleItalic}
                  className={`flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white dark:hover:bg-slate-700 transition-colors ${
                    isItalic ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600'
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleUnderline}
                  className={`flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white dark:hover:bg-slate-700 transition-colors ${
                    isUnderline ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600'
                  }`}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-4 h-4" />
                </button>
              </div>

              {/* Text Alignment */}
              <div className="flex items-center gap-1 border-r border-secondary-300 dark:border-slate-600 pr-2">
                <button
                  type="button"
                  onClick={() => setTextAlignment('left')}
                  className={`flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white dark:hover:bg-slate-700 transition-colors ${
                    textAlign === 'left' ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setTextAlignment('center')}
                  className={`flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white dark:hover:bg-slate-700 transition-colors ${
                    textAlign === 'center' ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setTextAlignment('right')}
                  className={`flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white dark:hover:bg-slate-700 transition-colors ${
                    textAlign === 'right' ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>

              {/* Indentation Controls */}
              <div className="flex items-center gap-1 border-r border-secondary-300 dark:border-slate-600 pr-2">
                <button
                  type="button"
                  onClick={decreaseIndent}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600 rounded hover:bg-secondary-50 dark:hover:bg-slate-800 transition-colors"
                  title="Decrease Indent (Shift+Tab)"
                >
                  <Outdent className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={increaseIndent}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600 rounded hover:bg-secondary-50 dark:hover:bg-slate-800 transition-colors"
                  title="Increase Indent (Tab)"
                >
                  <Indent className="w-4 h-4" />
                </button>
              </div>

              {/* List Formatting */}
              <div className="flex items-center gap-1 border-r border-secondary-300 pr-2">
                <button
                  type="button"
                  onClick={addBulletPoint}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600 rounded hover:bg-secondary-50 dark:hover:bg-slate-800 transition-colors"
                  title="Add bullet point"
                >
                  <List className="w-4 h-4" />
                  Bullet
                </button>

                <button
                  type="button"
                  onClick={addNumberedList}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-secondary-300 dark:border-slate-600 rounded hover:bg-secondary-50 dark:hover:bg-slate-800 transition-colors"
                  title="Add numbered list"
                >
                  <Type className="w-4 h-4" />
                  Number
                </button>
              </div>
              
              {/* Emojis */}
              <div className="flex items-center gap-1">
              <span className="text-sm text-secondary-600 dark:text-slate-300">
                  <Smile className="w-4 h-4 inline mr-1" />
                  Emojis:
                </span>
                
                <div className="flex flex-wrap gap-1">
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="text-lg hover:bg-white dark:hover:bg-slate-700 hover:scale-110 transition-all duration-150 rounded px-1 py-0.5"
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Rich Text Editor */}
            <div className="relative">
              <div
                ref={editorRef}
                contentEditable
                onInput={updateContent}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (editorRef.current && !editorRef.current.innerText) {
                    editorRef.current.innerText = '';
                  }
                }}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-secondary-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[300px] sm:min-h-[400px] resize-vertical font-mono text-sm leading-relaxed bg-white dark:bg-slate-950 text-secondary-900 dark:text-slate-100"
                style={{ 
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  direction: 'ltr'
                }}
              />
              {!formData.content && (
                <div className="absolute top-2 left-3 text-secondary-400 pointer-events-none font-mono text-sm leading-relaxed">
                  âœ¨ Enter your prompt content here...

ðŸ’¡ Pro tips:
â€¢ Use the formatting toolbar above for bold, italic, and alignment
â€¢ Press Tab to indent, Shift+Tab to outdent
â€¢ Use bullet points and emojis to make your prompts more engaging
â€¢ The analysis panel above will help you optimize your prompt in real-time
                </div>
              )}
            </div>

            <div className="text-sm text-secondary-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                {formData.content.length} characters â€¢ {formData.content.split(/\s+/).filter(word => word.length > 0).length} words
              </span>
              <span className="text-xs">
                ðŸ’¡ Tip: Use the formatting toolbar for Google Docs-like editing experience
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="order-6 flex items-center justify-between gap-2 border-t border-secondary-200 pt-4 dark:border-slate-800 sm:gap-3 sm:pt-6">
            <div className="flex items-center gap-2"><button type="button" onClick={pasteFromClipboard} className="rounded-xl border border-secondary-200 p-2.5 text-secondary-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-primary-950/30" title={`Paste into ${activeVariant} prompt`} aria-label="Paste into prompt"><Clipboard className="h-4 w-4" /></button><button type="button" onClick={() => { setPromptVariants({ general: '', json: '', structured: '' }); handleInputChange('content', ''); setPasteError(''); }} className="rounded-xl border border-secondary-200 p-2.5 text-secondary-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-red-950/30" title="Delete all prompt text" aria-label="Delete all prompt text"><Trash2 className="h-4 w-4" /></button></div>
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary text-sm sm:text-base px-3 sm:px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-sm sm:text-base px-3 sm:px-4 py-2"
              disabled={isUploading || !formData.title.trim() || !formData.content.trim() || !testedModels.length}
            >
              {isUploading ? 'Uploading image...' : (prompt ? 'Update Prompt' : 'Create Prompt')}
            </button>
          </div>
        </form>
      </div>
      {previewImage && previewImageUrl && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setPreviewImage(null); }}><div className="relative flex max-h-[90vh] max-w-5xl items-center justify-center rounded-2xl bg-slate-900 p-3 shadow-2xl"><button type="button" onClick={() => setPreviewImage(null)} className="absolute right-2 top-2 z-10 rounded-lg bg-slate-950/70 p-2 text-white" aria-label="Close image preview"><X className="h-5 w-5" /></button><img src={previewImageUrl} alt={previewImage.name} className="max-h-[82vh] max-w-full rounded-xl object-contain" /></div></div>}
    </div>
  );
};

export default PromptForm; 
