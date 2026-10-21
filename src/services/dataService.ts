import { promptService, projectService, categoryService, DocumentConflictError } from "./firebaseService";
import { auth } from "../config/firebase";
import { Prompt, Project, Category } from "../types";
import {
  getPrompts as getLocalPrompts, savePrompts as saveLocalPrompts, addPrompt as addLocalPrompt,
  updatePrompt as updateLocalPrompt, deletePrompt as deleteLocalPrompt, getProjects as getLocalProjects,
  addProject as addLocalProject, updateProject as updateLocalProject, deleteProject as deleteLocalProject,
  getCategories as getLocalCategories, addCategory as addLocalCategory, updateCategory as updateLocalCategory,
  deleteCategory as deleteLocalCategory
} from "../utils/storage";

export class DataServiceError extends Error {
  constructor(message: string, public readonly code = "unknown", public readonly cause?: unknown) {
    super(message);
    this.name = "DataServiceError";
  }
}

export interface LocalPromptSyncResult {
  synced: number;
  conflicts: string[];
  failures: Array<{ id: string; message: string }>;
}

export const isFirebaseConfigured = (): boolean => {
  const options = auth?.app?.options;
  return Boolean(options?.apiKey && options?.projectId && !options.apiKey.includes("your-api-key") && !options.projectId.includes("your-project"));
};

const requiresCloud = (): boolean => {
  if (!isFirebaseConfigured()) return false;
  if (!auth.currentUser) throw new DataServiceError("Sign in before accessing your cloud workspace.", "auth-required");
  return true;
};

const readableError = (error: unknown): DataServiceError => {
  if (error instanceof DataServiceError) return error;
  if (error instanceof DocumentConflictError) return new DataServiceError(error.message, "already-exists", error);
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "unknown";
  if (code.includes("permission-denied")) return new DataServiceError("You do not have permission to change this cloud data.", code, error);
  if (code.includes("unavailable") || code.includes("network")) return new DataServiceError("Cloud storage is unavailable. Check your connection and try again; your local data was not changed.", code, error);
  if (code.includes("resource-exhausted") || code.includes("quota")) return new DataServiceError("Cloud storage quota was reached. Nothing was saved locally as a fallback.", code, error);
  return new DataServiceError("Cloud storage could not complete the request. Please try again.", code, error);
};

const cloud = async <T>(operation: () => Promise<T>): Promise<T> => {
  try { return await operation(); } catch (error) { throw readableError(error); }
};

export const dataService = {
  async getPrompts(): Promise<Prompt[]> { return requiresCloud() ? cloud(() => promptService.getAll()) : getLocalPrompts(); },
  async addPrompt(prompt: Omit<Prompt, "id"> & Partial<Pick<Prompt, "id">>): Promise<string> {
    const id = prompt.id || crypto.randomUUID();
    if (!requiresCloud()) { addLocalPrompt({ ...prompt, id } as Prompt); return id; }
    return cloud(() => promptService.add({ ...prompt, id } as Prompt));
  },
  async updatePrompt(prompt: Prompt): Promise<void> { if (!requiresCloud()) return updateLocalPrompt(prompt); return cloud(() => promptService.update(prompt.id, prompt)); },
  async deletePrompt(id: string): Promise<void> { if (!requiresCloud()) return deleteLocalPrompt(id); return cloud(() => promptService.delete(id)); },
  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    if (!requiresCloud()) { saveLocalPrompts(getLocalPrompts().map(p => p.id === id ? { ...p, isFavorite } : p)); return; }
    return cloud(() => promptService.toggleFavorite(id, isFavorite));
  },
  async incrementUsage(id: string): Promise<void> {
    if (!requiresCloud()) { saveLocalPrompts(getLocalPrompts().map(p => p.id === id ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p)); return; }
    return cloud(() => promptService.incrementUsage(id));
  },
  async getProjects(): Promise<Project[]> { return requiresCloud() ? cloud(() => projectService.getAll()) : getLocalProjects(); },
  async addProject(project: Omit<Project, "id">): Promise<string> {
    const item = { ...project, id: crypto.randomUUID(), createdAt: new Date() } as Project;
    if (!requiresCloud()) { addLocalProject(item); return item.id; }
    return cloud(() => projectService.add(item));
  },
  async updateProject(project: Project): Promise<void> { if (!requiresCloud()) return updateLocalProject(project); return cloud(() => projectService.update(project.id, project)); },
  async deleteProject(id: string): Promise<void> { if (!requiresCloud()) return deleteLocalProject(id); return cloud(() => projectService.delete(id)); },
  async getCategories(): Promise<Category[]> { return requiresCloud() ? cloud(() => categoryService.getAll()) : getLocalCategories(); },
  async addCategory(category: Omit<Category, "id">): Promise<string> {
    const item = { ...category, id: crypto.randomUUID() } as Category;
    if (!requiresCloud()) { addLocalCategory(item); return item.id; }
    return cloud(() => categoryService.add(item));
  },
  async updateCategory(category: Category): Promise<void> { if (!requiresCloud()) return updateLocalCategory(category); return cloud(() => categoryService.update(category.id, category)); },
  async deleteCategory(id: string): Promise<void> { if (!requiresCloud()) return deleteLocalCategory(id); return cloud(() => categoryService.delete(id)); },
  subscribeToPrompts(callback: (items: Prompt[]) => void, onError?: (error: DataServiceError) => void) {
    try { return requiresCloud() ? promptService.subscribeToPrompts(callback, error => onError?.(readableError(error))) : (callback(getLocalPrompts()), () => {}); }
    catch (error) { onError?.(readableError(error)); return () => {}; }
  },
  subscribeToProjects(callback: (items: Project[]) => void, onError?: (error: DataServiceError) => void) {
    try { return requiresCloud() ? projectService.subscribeToProjects(callback, error => onError?.(readableError(error))) : (callback(getLocalProjects()), () => {}); }
    catch (error) { onError?.(readableError(error)); return () => {}; }
  },
  subscribeToCategories(callback: (items: Category[]) => void, onError?: (error: DataServiceError) => void) {
    try { return requiresCloud() ? categoryService.subscribeToCategories(callback, error => onError?.(readableError(error))) : (callback(getLocalCategories()), () => {}); }
    catch (error) { onError?.(readableError(error)); return () => {}; }
  },
  async syncLocalToCloud(): Promise<LocalPromptSyncResult> {
    if (!requiresCloud()) throw new DataServiceError("Connect to the cloud and sign in before importing local prompts.", "auth-required");
    const result: LocalPromptSyncResult = { synced: 0, conflicts: [], failures: [] };
    for (const prompt of getLocalPrompts()) {
      try { await cloud(() => promptService.add({ ...prompt, id: prompt.id })); result.synced++; }
      catch (error) {
        const safeError = readableError(error);
        if (safeError.code === "already-exists") result.conflicts.push(prompt.id);
        else result.failures.push({ id: prompt.id, message: safeError.message });
      }
    }
    return result;
  },
  isUsingFirestore(): boolean { return isFirebaseConfigured() && Boolean(auth.currentUser); },
  isUsingLocalStorage(): boolean { return !isFirebaseConfigured(); }
};
