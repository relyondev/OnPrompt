import React, { useEffect, useMemo, useState } from "react";
import { Prompt, Project, Category, PromptType } from "./types";
import { dataService } from "./services/dataService";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import PromptCard from "./components/PromptCard";
import PromptDetailModal from "./components/PromptDetailModal";
import PromptForm from "./components/PromptForm";
import ProjectForm from "./components/ProjectForm";
import CategoryForm from "./components/CategoryForm";
import Sidebar from "./components/Sidebar";
import SearchHeader from "./components/SearchHeader";
import SettingsModal from "./components/SettingsModal";
import LoginForm from "./components/LoginForm";
import CategoryGrid from "./components/CategoryGrid";
import BottomNav from "./components/BottomNav";
import { AI_MODELS, AiModelOption } from "./constants/models";
import { PREMADE_TAGS } from "./constants/tags";
import { loadUserSettings, saveUserSettings } from "./utils/settingsStorage";
import { exportPromptsToZip, readPromptPack, uploadImportedAttachment } from "./services/promptPackService";
import { 
  MessageSquare, 
  CheckCircle, 
  LogOut, 
  TrendingUp, 
  Sun, 
  Moon, 
  Heart, 
  Compass, 
  ArrowRight,
  Bell,
  Sparkles,
  SlidersHorizontal,
  Bookmark,
  Layers
} from "lucide-react";

type Feed = "discover" | PromptType;

function AppContent() {
  const { currentUser, logout, driveAccessToken } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [managedTags, setManagedTags] = useState<string[]>([...PREMADE_TAGS]);
  const [models, setModels] = useState<AiModelOption[]>(AI_MODELS);
  const [feed, setFeed] = useState<Feed>("discover");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("prompt-manager-sidebar-collapsed") !== "false"; } catch { return true; }
  });
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | undefined>();
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | undefined>();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [shouldReopenPromptForm, setShouldReopenPromptForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('');
  const [activeNavTab, setActiveNavTab] = useState<'discover' | 'categories' | 'favorites' | 'settings'>('discover');

  /* Real-time synchronization & initial load */
  useEffect(() => {
    if (!currentUser) return;
    const settings = loadUserSettings(currentUser.uid);
    setManagedTags(settings.tags);
    setModels(settings.models);

    // Initial load
    Promise.all([
      dataService.getPrompts(),
      dataService.getProjects(),
      dataService.getCategories()
    ]).then(([nextPrompts, nextProjects, nextCategories]) => {
      setPrompts(nextPrompts);
      setProjects(nextProjects);
      setCategories(nextCategories);
    });

    // Real-time synchronization
    const unsubPrompts = dataService.subscribeToPrompts((nextPrompts) => {
      setPrompts(nextPrompts);
    });
    const unsubProjects = dataService.subscribeToProjects((nextProjects) => {
      setProjects(nextProjects);
    });
    const unsubCategories = dataService.subscribeToCategories((nextCategories) => {
      setCategories(nextCategories);
    });

    return () => {
      unsubPrompts();
      unsubProjects();
      unsubCategories();
    };
  }, [currentUser]);

  useEffect(() => {
    try { localStorage.setItem("prompt-manager-sidebar-collapsed", String(isSidebarCollapsed)); } catch { /* Storage */ }
  }, [isSidebarCollapsed]);

  const refreshPrompts = async () => setPrompts(await dataService.getPrompts());
  const refreshProjects = async () => setProjects(await dataService.getProjects());
  const refreshCategories = async () => setCategories(await dataService.getCategories());
  const updateTags = (tags: string[]) => { setManagedTags(tags); if (currentUser) saveUserSettings(currentUser.uid, { tags, models }); };
  const updateModels = (nextModels: AiModelOption[]) => { setModels(nextModels); if (currentUser) saveUserSettings(currentUser.uid, { tags: managedTags, models: nextModels }); };
  const openDriveSettings = () => { setShowPromptForm(false); setShowSettings(true); setShouldReopenPromptForm(true); };
  const closeSettings = () => { setShowSettings(false); if (shouldReopenPromptForm) { setShowPromptForm(true); setShouldReopenPromptForm(false); } };

  const exportPromptPack = async () => {
    setCloudBusy(true); setCloudMessage('');
    try {
      const blob = await exportPromptsToZip(prompts, projects, categories, managedTags, driveAccessToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `on-prompt-pack-${new Date().toISOString().slice(0, 10)}.zip`; link.click();
      URL.revokeObjectURL(url); setCloudMessage(`Exported ${prompts.length} prompt${prompts.length === 1 ? '' : 's'} successfully.`);
    } catch (error: any) { setCloudMessage(error.message || 'Unable to export the prompt pack.'); }
    finally { setCloudBusy(false); }
  };

  const importPromptPack = async (file: File) => {
    setCloudBusy(true); setCloudMessage('');
    try {
      const { prompts: imported } = await readPromptPack(file);
      const hasImages = imported.some(({ prompt }) => (prompt.attachments || []).length > 0);
      if (hasImages && !driveAccessToken) throw new Error('Connect Google Drive before importing a pack containing images.');
      for (const { prompt, files } of imported) {
        const { packFiles, ...promptData } = prompt;
        const id = crypto.randomUUID();
        const attachments = [];
        for (const attachment of prompt.attachments || []) {
          const path = packFiles?.[`attachment:${attachment.id}`];
          const bytes = path ? files.get(path) : undefined;
          if (bytes && driveAccessToken) attachments.push(await uploadImportedAttachment(bytes, attachment.name, attachment.mimeType, id, attachment.role, driveAccessToken));
        }
        await dataService.addPrompt({ ...promptData, id, attachments, createdAt: new Date(prompt.createdAt), updatedAt: new Date() });
      }
      await refreshPrompts(); setCloudMessage(`Imported ${imported.length} prompt${imported.length === 1 ? '' : 's'} successfully.`);
    } catch (error: any) { setCloudMessage(error.message || 'Unable to import the prompt pack.'); }
    finally { setCloudBusy(false); }
  };

  const filteredPrompts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = prompts.filter(prompt => {
      const matchesSearch = !query || prompt.title.toLowerCase().includes(query) || prompt.content.toLowerCase().includes(query) || (prompt.tags || []).some(tag => tag.toLowerCase().includes(query));
      const matchesProject = !selectedProject || prompt.project === selectedProject;
      const matchesCategory = !selectedCategory || prompt.category?.toLowerCase() === selectedCategory.toLowerCase() || (prompt.tags || []).some(t => t.toLowerCase() === selectedCategory.toLowerCase());
      const matchesTag = !selectedTag || (prompt.tags || []).includes(selectedTag);
      const matchesType = feed === "discover" || (prompt.promptType || "TXT_TO_TXT") === feed;
      const matchesFavorites = !showFavorites || prompt.isFavorite;
      return matchesSearch && matchesProject && matchesCategory && matchesTag && matchesType && matchesFavorites;
    });
    return [...filtered].sort((a, b) => b.usageCount - a.usageCount);
  }, [feed, prompts, searchQuery, selectedProject, selectedCategory, selectedTag, showFavorites]);

  const recentProjects = useMemo(() => {
    const lastUsed = new Map<string, number>();
    prompts.forEach(prompt => {
      const timestamp = new Date(prompt.updatedAt).getTime();
      if (prompt.project) lastUsed.set(prompt.project, Math.max(lastUsed.get(prompt.project) || 0, timestamp));
    });
    return [...projects].sort((a, b) => (lastUsed.get(b.name) || 0) - (lastUsed.get(a.name) || 0));
  }, [projects, prompts]);

  const popularTags = useMemo(() => {
    const usage = new Map<string, number>();
    prompts.forEach(prompt => {
      (prompt.tags || []).forEach(tag => usage.set(tag, (usage.get(tag) || 0) + 1 + prompt.usageCount));
    });
    return [...managedTags].sort((a, b) => (usage.get(b) || 0) - (usage.get(a) || 0));
  }, [managedTags, prompts]);

  if (!currentUser) return <LoginForm />;

  const savePrompt = async (prompt: Prompt) => {
    if (editingPrompt) await dataService.updatePrompt(prompt); else await dataService.addPrompt(prompt);
    await refreshPrompts(); setShowPromptForm(false); setEditingPrompt(undefined);
  };
  const deletePrompt = async (id: string) => { if (window.confirm("Delete this prompt?")) { await dataService.deletePrompt(id); await refreshPrompts(); } };
  const toggleFavorite = async (id: string) => { const prompt = prompts.find(item => item.id === id); if (prompt) { await dataService.toggleFavorite(id, !prompt.isFavorite); await refreshPrompts(); } };
  const copyPrompt = (prompt: Prompt, content?: string) => {
    navigator.clipboard.writeText(content ?? prompt.content);
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 2000);
    dataService.incrementUsage(prompt.id);
  };
  const saveProject = async (project: Project) => { if (editingProject) await dataService.updateProject(project); else await dataService.addProject(project); await refreshProjects(); setShowProjectForm(false); setEditingProject(undefined); if (shouldReopenPromptForm) { setShowPromptForm(true); setShouldReopenPromptForm(false); } };
  const deleteProject = async (id: string) => { if (window.confirm("Delete this category and its prompts?")) { await dataService.deleteProject(id); await refreshProjects(); await refreshPrompts(); } };
  const saveCategory = async (category: Category) => { if (editingCategory) await dataService.updateCategory(category); else await dataService.addCategory(category); await refreshCategories(); setShowCategoryForm(false); setEditingCategory(undefined); };

  const handleBottomNavSelect = (tab: string) => {
    if (tab === 'discover') {
      setActiveNavTab('discover');
      setShowFavorites(false);
      setShowSettings(false);
      setSelectedCategory('');
    } else if (tab === 'categories') {
      setActiveNavTab('categories');
      setShowFavorites(false);
      setShowSettings(false);
      document.getElementById('category-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (tab === 'favorites') {
      setActiveNavTab('favorites');
      setShowFavorites(true);
      setShowSettings(false);
    } else if (tab === 'settings') {
      setActiveNavTab('settings');
      setShowSettings(true);
    }
  };

  const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || "Prompt Master";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#060f1e] page-enter text-slate-800 dark:text-slate-100">
      <div className="flex w-full">
        {/* Navigation Sidebar */}
        <Sidebar 
          projects={projects} 
          recentProjects={recentProjects} 
          categories={categories} 
          availableTags={managedTags} 
          popularTags={popularTags} 
          isOpen={isSidebarOpen} 
          isCollapsed={isSidebarCollapsed} 
          onClose={() => setIsSidebarOpen(false)} 
          onToggleCollapse={() => { if (window.matchMedia("(min-width: 1024px)").matches) setIsSidebarCollapsed(collapsed => !collapsed); }} 
          selectedProject={selectedProject} 
          selectedCategory={selectedCategory} 
          selectedTag={selectedTag} 
          showFavorites={showFavorites} 
          onProjectSelect={value => { setSelectedProject(value); setSelectedCategory(""); setIsSidebarOpen(false); }} 
          onCategorySelect={value => { setSelectedCategory(value); setIsSidebarOpen(false); }} 
          onTagSelect={value => { setSelectedTag(value); setIsSidebarOpen(false); }} 
          onToggleFavorites={() => setShowFavorites(!showFavorites)} 
          onAddProject={() => setShowProjectForm(true)} 
          onEditProject={project => { setEditingProject(project); setShowProjectForm(true); }} 
          onDeleteProject={deleteProject} 
          onAddCategory={() => setShowCategoryForm(true)} 
          onSettings={() => { setShowSettings(true); setIsSidebarOpen(false); }} 
          onFeedSelect={value => { setFeed(value); setShowFavorites(false); setShowSettings(false); setIsSidebarOpen(false); }} 
          settingsActive={showSettings} 
          activeFeed={feed} 
        />

        {/* Main Workspace Surface */}
        <main id="app-main" tabIndex={-1} className="min-w-0 flex-1 px-4 sm:px-6 lg:px-10 pt-[max(16px,env(safe-area-inset-top))] max-w-7xl mx-auto pb-24 lg:pb-12">
          
          {/* Top User Greeting Bar matching Reference Screens 4 & 5 */}
          <div className="flex items-center justify-between gap-3 mb-6" aria-label="User greeting and controls">
            {/* Left: Avatar + Greeting */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25"
                aria-label="Open menu"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={displayName} 
                  className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-500/20"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                  {initials}
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-400">
                  Welcome back,
                </p>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[200px] sm:max-w-md">
                  {displayName}
                </h2>
              </div>
            </div>

            {/* Right: Theme Toggle & Logout */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="topbar-icon-button"
                aria-label="Toggle theme"
                title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              >
                {theme === "light" ? <Moon className="h-5 w-5 text-slate-600" /> : <Sun className="h-5 w-5 text-yellow-400" />}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="topbar-icon-button topbar-logout-button"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>

          {showSettings ? (
            <SettingsModal 
              projects={projects} 
              tags={managedTags} 
              models={models} 
              initialTab={shouldReopenPromptForm ? "drive" : "collections"} 
              isPage 
              onClose={closeSettings} 
              onAddProject={() => { setShowSettings(false); setShowProjectForm(true); }} 
              onEditProject={project => { setShowSettings(false); setEditingProject(project); setShowProjectForm(true); }} 
              onDeleteProject={deleteProject} 
              onUpdateTags={updateTags} 
              onUpdateModels={updateModels} 
              onExportPrompts={exportPromptPack}
              onImportPrompts={importPromptPack}
              cloudBusy={cloudBusy}
              cloudMessage={cloudMessage}
            />
          ) : (
            <>
              {/* Feature Banner: Refined, compact header row */}
              <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0057D6] to-[#0047B0] p-5 sm:p-6 text-white shadow-sm">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/20 text-white backdrop-blur-md mb-2 border border-white/20">
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>AI Prompt Workspace</span>
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight">
                      Turn ideas into high-performing prompts
                    </h3>
                    <p className="text-xs text-blue-100 mt-1 max-w-lg">
                      Organize, test across models, and copy tested prompts in a single click.
                    </p>
                  </div>

                  <div className="shrink-0">
                    <button 
                      onClick={() => setShowPromptForm(true)} 
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#0057D6] shadow-sm transition-all hover:bg-blue-50 active:scale-95"
                    >
                      <span>New Prompt</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </section>

              {/* Category Explorer matching Reference Screen 9 */}
              <div id="category-section">
                <CategoryGrid 
                  selectedCategory={selectedCategory}
                  onSelectCategory={(cat) => setSelectedCategory(cat)}
                />
              </div>

              {/* Search & Tag Filter Bar matching Reference */}
              <SearchHeader 
                query={searchQuery} 
                tags={popularTags.slice(0, 8)} 
                selectedTag={selectedTag} 
                showFavorites={showFavorites} 
                onQueryChange={setSearchQuery} 
                onTagChange={value => setSelectedTag(value)} 
                onToggleFavorites={() => setShowFavorites(current => !current)} 
              />

              {/* Section Header: Popular Prompts / Filter summary */}
              <div className="flex items-center justify-between mb-4 mt-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {showFavorites ? "Saved Prompts" : selectedCategory ? `${selectedCategory} Prompts` : "Popular Prompts"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {filteredPrompts.length} prompt{filteredPrompts.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              {/* Prompt Card Grid or Empty State */}
              {filteredPrompts.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredPrompts.map(prompt => (
                    <PromptCard 
                      key={prompt.id} 
                      prompt={prompt} 
                      onOpen={setViewingPrompt} 
                      onEdit={promptToEdit => { setViewingPrompt(undefined); setEditingPrompt(promptToEdit); setShowPromptForm(true); }} 
                      onDelete={deletePrompt} 
                      onToggleFavorite={toggleFavorite} 
                      onCopy={copyPrompt} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-navy-800 bg-white/60 dark:bg-navy-950/40">
                  <MessageSquare className="w-12 h-12 text-slate-300 dark:text-navy-600 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">No prompts found</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 mb-5 text-xs sm:text-sm max-w-sm mx-auto">
                    {searchQuery || selectedTag || selectedProject || showFavorites || selectedCategory
                      ? "Try adjusting your search query, clearing category, or turning off filters." 
                      : "Create your first prompt to populate this workspace."}
                  </p>
                  <button onClick={() => setShowPromptForm(true)} className="btn-primary inline-flex items-center gap-2 text-xs sm:text-sm">
                    <span>Create prompt</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Prompt Detail Modal */}
          {viewingPrompt && (
            <PromptDetailModal
              prompt={viewingPrompt}
              onClose={() => setViewingPrompt(undefined)}
              onCopy={copyPrompt}
              onToggleFavorite={toggleFavorite}
              onEdit={(p) => {
                setViewingPrompt(undefined);
                setEditingPrompt(p);
                setShowPromptForm(true);
              }}
            />
          )}

          {/* Prompt Edit / Create Form Modal */}
          {showPromptForm && (
            <PromptForm
              prompt={editingPrompt}
              projects={projects}
              categories={categories}
              availableTags={managedTags}
              modelOptions={models}
              onSave={savePrompt}
              onCancel={() => { setShowPromptForm(false); setEditingPrompt(undefined); }}
              onAddProject={() => { setShowPromptForm(false); setShouldReopenPromptForm(true); setShowProjectForm(true); }}
              onRequireDrive={() => { setShowPromptForm(false); setShouldReopenPromptForm(true); setShowSettings(true); }}
            />
          )}

          {/* Project Form Modal */}
          {showProjectForm && (
            <ProjectForm
              project={editingProject}
              onSave={saveProject}
              onCancel={() => { setShowProjectForm(false); setEditingProject(undefined); }}
            />
          )}

          {/* Category Form Modal */}
          {showCategoryForm && (
            <CategoryForm
              category={editingCategory}
              projects={projects}
              onSave={saveCategory}
              onCancel={() => { setShowCategoryForm(false); setEditingCategory(undefined); }}
            />
          )}

          {/* Toast Notification */}
          {showCopiedMessage && (
            <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 z-50 text-xs font-bold border border-slate-700 dark:border-slate-200 animate-bounce">
              <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Prompt copied to clipboard!</span>
            </div>
          )}
        </main>
      </div>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <BottomNav
        activeTab={activeNavTab}
        onTabSelect={handleBottomNavSelect}
        onOpenCreate={() => setShowPromptForm(true)}
        favoritesCount={prompts.filter(p => p.isFavorite).length}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
