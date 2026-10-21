import { Prompt, Project, Category } from '../types';

export class LocalStorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) { super(message); this.name = 'LocalStorageError'; }
}

const STORAGE_KEYS = { PROMPTS: 'prompt-manager-prompts', PROJECTS: 'prompt-manager-projects', CATEGORIES: 'prompt-manager-categories' };

const getFromStorage = <T>(key: string): T[] => {
  try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : []; }
  catch (error) { throw new LocalStorageError('Local data could not be read. Your existing records were not changed.', error); }
};
const saveToStorage = <T>(key: string, data: T[]): void => {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (error) { throw new LocalStorageError('Local data could not be saved. Your existing records were not changed.', error); }
};

export const getPrompts = (): Prompt[] => getFromStorage<Prompt>(STORAGE_KEYS.PROMPTS).map(prompt => ({ ...prompt, createdAt: new Date(prompt.createdAt), updatedAt: new Date(prompt.updatedAt) }));
export const savePrompts = (prompts: Prompt[]): void => saveToStorage(STORAGE_KEYS.PROMPTS, prompts);
export const addPrompt = (prompt: Prompt): void => { const prompts = getPrompts(); prompts.push(prompt); savePrompts(prompts); };
export const updatePrompt = (prompt: Prompt): void => { const prompts = getPrompts(); const index = prompts.findIndex(item => item.id === prompt.id); if (index !== -1) { prompts[index] = prompt; savePrompts(prompts); } };
export const deletePrompt = (id: string): void => savePrompts(getPrompts().filter(prompt => prompt.id !== id));

export const getProjects = (): Project[] => getFromStorage<Project>(STORAGE_KEYS.PROJECTS).map(project => ({ ...project, createdAt: new Date(project.createdAt) }));
export const saveProjects = (projects: Project[]): void => saveToStorage(STORAGE_KEYS.PROJECTS, projects);
export const addProject = (project: Project): void => { const projects = getProjects(); projects.push(project); saveProjects(projects); };
export const updateProject = (project: Project): void => { const projects = getProjects(); const index = projects.findIndex(item => item.id === project.id); if (index !== -1) { projects[index] = project; saveProjects(projects); } };
export const deleteProject = (id: string): void => saveProjects(getProjects().filter(project => project.id !== id));

export const getCategories = (): Category[] => getFromStorage<Category>(STORAGE_KEYS.CATEGORIES);
export const saveCategories = (categories: Category[]): void => saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
export const addCategory = (category: Category): void => { const categories = getCategories(); categories.push(category); saveCategories(categories); };
export const updateCategory = (category: Category): void => { const categories = getCategories(); const index = categories.findIndex(item => item.id === category.id); if (index !== -1) { categories[index] = category; saveCategories(categories); } };
export const deleteCategory = (id: string): void => saveCategories(getCategories().filter(category => category.id !== id));
