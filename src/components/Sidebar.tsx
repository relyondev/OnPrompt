import React, { useEffect, useRef, useState } from 'react';
import { Project, Category, PromptType } from '../types';
import { ChevronDown, ChevronLeft, Compass, FileText, Folder, FolderOpen, Image, Layers, MoreHorizontal, Plus, Settings, Tag, Type, X } from 'lucide-react';
import OnPromptLogo from './OnPromptLogo';

interface SidebarProps {
  projects: Project[]; recentProjects: Project[]; categories: Category[];
  availableTags: string[]; popularTags: string[];
  isOpen: boolean; isCollapsed: boolean; onClose: () => void; onToggleCollapse: () => void;
  selectedProject: string; selectedCategory: string; selectedTag: string; showFavorites: boolean;
  onProjectSelect: (project: string) => void; onCategorySelect: (category: string) => void;
  onTagSelect: (tag: string) => void; onToggleFavorites: () => void;
  onAddProject: () => void; onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void; onAddCategory: () => void;
  onSettings: () => void; onFeedSelect: (feed: 'discover' | PromptType) => void;
  settingsActive: boolean; activeFeed: 'discover' | PromptType;
}

const promptTypes: Array<{ value: PromptType; label: string; icon: typeof Image }> = [
  { value: 'IMG_TO_IMG', label: 'Image Reference', icon: Image },
  { value: 'TXT_TO_IMG', label: 'Image Creation', icon: FileText },
  { value: 'TXT_TO_TXT', label: 'Text Sequence', icon: Type },
];

const Sidebar: React.FC<SidebarProps> = ({ projects, recentProjects, categories, availableTags, popularTags,
  isOpen, isCollapsed, onClose, onToggleCollapse, selectedProject, selectedCategory, selectedTag,
  showFavorites, onProjectSelect, onCategorySelect, onTagSelect, onAddProject,
  onSettings, onFeedSelect, settingsActive, activeFeed }) => {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [openGroup, setOpenGroup] = useState<'categories' | 'tags' | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const brandRef = useRef<HTMLButtonElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pendingToggleFocus = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const compact = isDesktop && isCollapsed;
  const modal = !isDesktop && isOpen;
  const hidden = !isDesktop && !isOpen;
  const selectedProjectId = projects.find(project => project.name === selectedProject)?.id;
  const subcategories = categories.filter(category => category.projectId === selectedProjectId);
  const categoryItems = showAllCategories ? projects : recentProjects.slice(0, 3);
  const tagItems = showAllTags ? availableTags : popularTags.slice(0, 5);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => { setIsDesktop(media.matches); onCloseRef.current(); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const main = document.getElementById('app-main');
    const previouslyInert = main?.hasAttribute('inert');
    main?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(asideRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]') || [])
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (!previouslyInert) main?.removeAttribute('inert');
      if (previousFocus?.isConnected && previousFocus.getClientRects().length) previousFocus.focus();
      else document.getElementById('app-main')?.focus();
    };
  }, [modal]);

  useEffect(() => {
    if (!pendingToggleFocus.current) return;
    (compact ? brandRef.current : collapseRef.current)?.focus();
    pendingToggleFocus.current = false;
  }, [compact]);

  const toggleCollapse = () => { pendingToggleFocus.current = true; onToggleCollapse(); };
  const toggleGroup = (group: 'categories' | 'tags') => {
    if (compact) { setOpenGroup(group); toggleCollapse(); }
    else setOpenGroup(current => current === group ? null : group);
  };
  const icon = (Icon: typeof Compass) => <span className="sidebar-icon"><Icon size={20} aria-hidden="true" /></span>;
  const label = (text: string) => !compact && <span className="sidebar-label">{text}</span>;
  const groupButton = (group: 'categories' | 'tags', text: string, Icon: typeof Compass, active: boolean, onAdd?: () => void) => (
    <div className="sidebar-group-row">
      <button type="button" className="sidebar-item" data-active={active || undefined}
        onClick={() => toggleGroup(group)} aria-label={text} title={text}
        aria-expanded={!compact && openGroup === group} aria-controls={`sidebar-${group}`}>
        {icon(Icon)}{label(text)}{!compact && <ChevronDown size={16} className={`sidebar-chevron ${openGroup === group ? 'is-open' : ''}`} aria-hidden="true" />}
      </button>
      {!compact && onAdd && <button type="button" className="sidebar-add-control" onClick={onAdd} aria-label={`Add ${text.toLowerCase().replace(/s$/, '')}`} title={`Add ${text.toLowerCase().replace(/s$/, '')}`}><Plus size={17} aria-hidden="true" /></button>}
    </div>
  );

  return <>
    {modal && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
    <aside ref={asideRef} id="app-sidebar" className="app-sidebar" data-compact={compact || undefined}
      data-open={isOpen || undefined} aria-label="Primary navigation" aria-hidden={hidden || undefined}
      role={modal ? 'dialog' : undefined} aria-modal={modal || undefined}
      {...(hidden ? { inert: '' } : {})}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          {compact ? (
            <button
              ref={brandRef}
              type="button"
              className="sidebar-logo"
              onClick={toggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              aria-expanded={false}
              aria-controls="app-sidebar"
            >
              {/* Symbol-only for compact sidebar */}
              <OnPromptLogo size={32} ariaHidden />
            </button>
          ) : (
            <span className="sidebar-logo">
              <OnPromptLogo size={32} ariaHidden />
            </span>
          )}
          {!compact && (
            <span aria-label="On Prompt by Relyon Dev">
              <span className="sidebar-name">On Prompt</span>
              <span className="sidebar-name-sub">by Relyon Dev</span>
            </span>
          )}
        </div>
        {!compact && (
          isDesktop
            ? <button ref={collapseRef} type="button" className="sidebar-control" onClick={toggleCollapse}
                aria-label="Collapse sidebar" title="Collapse sidebar" aria-expanded={true} aria-controls="app-sidebar">
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            : <button ref={closeRef} type="button" className="sidebar-control" onClick={onClose} aria-label="Close navigation">
                <X size={20} aria-hidden="true" />
              </button>
        )}
      </div>
      <nav className="sidebar-scroll-region scrollbar-subtle" aria-label="Main">
        <button type="button" className="sidebar-item" data-active={(activeFeed === 'discover' && !showFavorites && !settingsActive) || undefined}
          onClick={() => onFeedSelect('discover')} aria-label="Discover Prompt" title="Discover Prompt"
          aria-current={activeFeed === 'discover' && !showFavorites && !settingsActive ? 'page' : undefined}>{icon(Compass)}{label('Discover Prompt')}</button>
        <section className="sidebar-section" aria-label="Prompt types">
          {promptTypes.map(({ value, label: text, icon: Icon }) => <button key={value} type="button" className="sidebar-item"
            data-active={(activeFeed === value && !settingsActive) || undefined} onClick={() => onFeedSelect(value)} title={text}
            aria-current={activeFeed === value && !settingsActive ? 'page' : undefined}>{icon(Icon)}{label(text)}</button>)}
        </section>
        <section className="sidebar-section sidebar-section-separated" aria-label="Categories">
          {groupButton('categories', 'Categories', Folder, Boolean(selectedProject), () => { onClose(); onAddProject(); })}
          <div id="sidebar-categories" hidden={compact || openGroup !== 'categories'} className="sidebar-children">
            {categoryItems.map(project => <React.Fragment key={project.id}>
              <button type="button" className="sidebar-item" title={project.name} onClick={() => onProjectSelect(project.name)}
                data-active={selectedProject === project.name || undefined} aria-pressed={selectedProject === project.name}>
                {icon(selectedProject === project.name ? FolderOpen : Folder)}{label(project.name)}</button>
              {selectedProject === project.name && subcategories.length > 0 && <div className="sidebar-subcategories" aria-label={`${project.name} subcategories`}>
                <button type="button" className="sidebar-item" onClick={() => onCategorySelect('')} aria-pressed={!selectedCategory}>{icon(Layers)}{label('All subcategories')}</button>
                {subcategories.map(category => <button type="button" key={category.id} className="sidebar-item" title={category.name}
                  onClick={() => onCategorySelect(category.name)} data-active={selectedCategory === category.name || undefined}
                  aria-pressed={selectedCategory === category.name}>{icon(Tag)}{label(category.name)}</button>)}
              </div>}
            </React.Fragment>)}
            {projects.length > 3 && <button type="button" className="sidebar-item" onClick={() => setShowAllCategories(value => !value)}>{icon(MoreHorizontal)}{label(showAllCategories ? 'Show fewer categories' : 'More categories')}</button>}
          </div>
        </section>
        {availableTags.length > 0 && <section className="sidebar-section" aria-label="Tags">
          {groupButton('tags', 'Tags', Tag, Boolean(selectedTag), onSettings)}
          <div id="sidebar-tags" hidden={compact || openGroup !== 'tags'} className="sidebar-children">
            <button type="button" className="sidebar-item" onClick={() => onTagSelect('')} aria-pressed={!selectedTag}>{icon(Tag)}{label('All tags')}</button>
            {tagItems.map(tag => <button key={tag} type="button" className="sidebar-item" title={`#${tag}`} onClick={() => onTagSelect(tag)}
              aria-pressed={selectedTag === tag} data-active={selectedTag === tag || undefined}>{icon(Tag)}{label(`#${tag}`)}</button>)}
            {availableTags.length > 5 && <button type="button" className="sidebar-item" onClick={() => setShowAllTags(value => !value)}>{icon(MoreHorizontal)}{label(showAllTags ? 'Show fewer tags' : 'More tags')}</button>}
            <button type="button" className="sidebar-item" onClick={onSettings}>{icon(Plus)}{label('Manage tags')}</button>
          </div>
        </section>}
      </nav>
      <div className="sidebar-footer">
        <button type="button" className="sidebar-item" onClick={onSettings} data-active={settingsActive || undefined}
          title="Settings" aria-label="Settings" aria-current={settingsActive ? 'page' : undefined}>{icon(Settings)}{label('Settings')}</button>
        {!compact && <p className="sidebar-version">On Prompt · v1.0.0</p>}
      </div>
    </aside>
  </>;
};
export default Sidebar;
