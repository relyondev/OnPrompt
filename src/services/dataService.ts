import { promptService, projectService, categoryService } from "./firebaseService";
import { auth } from "../config/firebase";
import { Prompt, Project, Category } from "../types";
import { 
  getPrompts as getLocalPrompts,
  savePrompts as saveLocalPrompts,
  addPrompt as addLocalPrompt,
  updatePrompt as updateLocalPrompt,
  deletePrompt as deleteLocalPrompt,
  getProjects as getLocalProjects,
  addProject as addLocalProject,
  updateProject as updateLocalProject,
  deleteProject as deleteLocalProject,
  getCategories as getLocalCategories,
  addCategory as addLocalCategory,
  updateCategory as updateLocalCategory,
  deleteCategory as deleteLocalCategory
} from "../utils/storage";

// Check if Firebase is properly configured from initialized options
export const isFirebaseConfigured = (): boolean => {
  const options = auth?.app?.options;
  return Boolean(
    options?.apiKey &&
    options?.projectId &&
    !options.apiKey.includes("your-api-key") &&
    !options.projectId.includes("your-project")
  );
};

// Check if current session should use Firestore (configured + authenticated)
const shouldUseFirestore = (): boolean => {
  return isFirebaseConfigured() && Boolean(auth.currentUser);
};

// Unified Data Service - handles both Firestore and localStorage seamlessly
export const dataService = {
  // Prompt operations
  async getPrompts(): Promise<Prompt[]> {
    if (!shouldUseFirestore()) {
      return getLocalPrompts();
    }
    try {
      return await promptService.getAll();
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      return getLocalPrompts();
    }
  },

  async addPrompt(prompt: Omit<Prompt, "id"> & Partial<Pick<Prompt, "id">>): Promise<string> {
    const id = prompt.id || crypto.randomUUID();
    if (!shouldUseFirestore()) {
      addLocalPrompt({ ...prompt, id } as Prompt);
      return id;
    }
    try {
      await promptService.add({ ...prompt, id } as Prompt);
      return id;
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      addLocalPrompt({ ...prompt, id } as Prompt);
      return id;
    }
  },

  async updatePrompt(prompt: Prompt): Promise<void> {
    if (!shouldUseFirestore()) {
      updateLocalPrompt(prompt);
      return;
    }
    try {
      await promptService.update(prompt.id, prompt);
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      updateLocalPrompt(prompt);
    }
  },

  async deletePrompt(promptId: string): Promise<void> {
    if (!shouldUseFirestore()) {
      deleteLocalPrompt(promptId);
      return;
    }
    try {
      await promptService.delete(promptId);
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      deleteLocalPrompt(promptId);
    }
  },

  async toggleFavorite(promptId: string, isFavorite: boolean): Promise<void> {
    if (!shouldUseFirestore()) {
      const prompts = getLocalPrompts();
      const updatedPrompts = prompts.map(p => 
        p.id === promptId ? { ...p, isFavorite } : p
      );
      saveLocalPrompts(updatedPrompts);
      return;
    }
    try {
      await promptService.toggleFavorite(promptId, isFavorite);
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      const prompts = getLocalPrompts();
      const updatedPrompts = prompts.map(p => 
        p.id === promptId ? { ...p, isFavorite } : p
      );
      saveLocalPrompts(updatedPrompts);
    }
  },

  async incrementUsage(promptId: string): Promise<void> {
    if (!shouldUseFirestore()) {
      const prompts = getLocalPrompts();
      const updatedPrompts = prompts.map(p => 
        p.id === promptId ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p
      );
      saveLocalPrompts(updatedPrompts);
      return;
    }
    try {
      await promptService.incrementUsage(promptId);
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      const prompts = getLocalPrompts();
      const updatedPrompts = prompts.map(p => 
        p.id === promptId ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p
      );
      saveLocalPrompts(updatedPrompts);
    }
  },

  // Project operations
  async getProjects(): Promise<Project[]> {
    if (!shouldUseFirestore()) {
      return getLocalProjects();
    }
    try {
      return await projectService.getAll();
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      return getLocalProjects();
    }
  },

  async addProject(project: Omit<Project, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const newProject = { ...project, id, createdAt: new Date() } as Project;
    if (!shouldUseFirestore()) {
      addLocalProject(newProject);
      return id;
    }
    try {
      await projectService.add(newProject);
      return id;
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      addLocalProject(newProject);
      return id;
    }
  },

  async updateProject(project: Project): Promise<void> {
    if (!shouldUseFirestore()) {
      updateLocalProject(project);
      return;
    }
    try {
      await projectService.update(project.id, project);
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      updateLocalProject(project);
    }
  },

  async deleteProject(projectId: string): Promise<void> {
    if (!shouldUseFirestore()) {
      deleteLocalProject(projectId);
      return;
    }
    try {
      await projectService.delete(projectId);
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      deleteLocalProject(projectId);
    }
  },

  // Category operations
  async getCategories(): Promise<Category[]> {
    if (!shouldUseFirestore()) {
      return getLocalCategories();
    }
    try {
      return await categoryService.getAll();
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      return getLocalCategories();
    }
  },

  async addCategory(category: Omit<Category, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const newCategory = { ...category, id } as Category;
    if (!shouldUseFirestore()) {
      addLocalCategory(newCategory);
      return id;
    }
    try {
      await categoryService.add(newCategory);
      return id;
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      addLocalCategory(newCategory);
      return id;
    }
  },

  async updateCategory(category: Category): Promise<void> {
    if (!shouldUseFirestore()) {
      updateLocalCategory(category);
      return;
    }
    try {
      await categoryService.update(category.id, category);
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      updateLocalCategory(category);
    }
  },

  async deleteCategory(categoryId: string): Promise<void> {
    if (!shouldUseFirestore()) {
      deleteLocalCategory(categoryId);
      return;
    }
    try {
      await categoryService.delete(categoryId);
    } catch (error) {
      console.warn("Firebase failed, falling back to localStorage:", error);
      deleteLocalCategory(categoryId);
    }
  },

  // Real-time subscriptions
  subscribeToPrompts(callback: (prompts: Prompt[]) => void) {
    if (!shouldUseFirestore()) {
      callback(getLocalPrompts());
      return () => {};
    }
    try {
      return promptService.subscribeToPrompts(callback, (error) => {
        console.warn("Firebase prompts subscription failed, using local storage fallback:", error);
        callback(getLocalPrompts());
      });
    } catch (error) {
      console.warn("Firebase subscription failed, falling back to localStorage:", error);
      callback(getLocalPrompts());
      return () => {};
    }
  },

  subscribeToProjects(callback: (projects: Project[]) => void) {
    if (!shouldUseFirestore()) {
      callback(getLocalProjects());
      return () => {};
    }
    try {
      return projectService.subscribeToProjects(callback, (error) => {
        console.warn("Firebase projects subscription failed, using local storage fallback:", error);
        callback(getLocalProjects());
      });
    } catch (error) {
      console.warn("Firebase subscription failed, falling back to localStorage:", error);
      callback(getLocalProjects());
      return () => {};
    }
  },

  subscribeToCategories(callback: (categories: Category[]) => void) {
    if (!shouldUseFirestore()) {
      callback(getLocalCategories());
      return () => {};
    }
    try {
      return categoryService.subscribeToCategories(callback, (error) => {
        console.warn("Firebase categories subscription failed, using local storage fallback:", error);
        callback(getLocalCategories());
      });
    } catch (error) {
      console.warn("Firebase subscription failed, falling back to localStorage:", error);
      callback(getLocalCategories());
      return () => {};
    }
  },

  // Sync local offline prompts to Firestore
  async syncLocalToCloud(): Promise<number> {
    if (!shouldUseFirestore()) return 0;
    const localPrompts = getLocalPrompts();
    if (!localPrompts || localPrompts.length === 0) return 0;

    let synced = 0;
    for (const p of localPrompts) {
      try {
        await promptService.add(p);
        synced++;
      } catch (e) {
        console.warn("Sync error for prompt", p.id, e);
      }
    }
    return synced;
  },

  // Utility functions
  isUsingFirestore(): boolean {
    return shouldUseFirestore();
  },

  isUsingLocalStorage(): boolean {
    return !shouldUseFirestore();
  }
};
