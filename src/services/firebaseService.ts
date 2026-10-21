import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  writeBatch,
  runTransaction,
  increment
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { Prompt, Project, Category } from "../types";

// Collection names
const COLLECTIONS = {
  PROMPTS: "prompts",
  PROJECTS: "projects",
  CATEGORIES: "categories"
};

export class DocumentConflictError extends Error {
  constructor(collectionName: string, id: string) {
    super(`A ${collectionName} item with this ID already exists. No cloud data was overwritten.`);
    this.name = "DocumentConflictError";
  }
}

// Get current user ID
const getCurrentUserId = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user.uid;
};

// Convert Firestore timestamp or date string/number to safe Date
const convertTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (typeof timestamp?.toDate === "function") {
    return timestamp.toDate();
  }
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? new Date() : date;
};

// Convert any Date/timestamp representation to Firestore Timestamp
const convertToTimestamp = (date: any): Timestamp => {
  if (date instanceof Timestamp) return date;
  if (typeof date?.toDate === "function") return date;
  if (date instanceof Date && !isNaN(date.getTime())) {
    return Timestamp.fromDate(date);
  }
  if (typeof date === "string" || typeof date === "number") {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return Timestamp.fromDate(parsed);
    }
  }
  return Timestamp.now();
};

const createIfAbsent = async (collectionName: string, id: string, data: Record<string, unknown>): Promise<void> => {
  const ref = doc(db, collectionName, id);
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(ref);
    if (existing.exists()) throw new DocumentConflictError(collectionName, id);
    transaction.set(ref, data);
  });
};

const withoutProtectedFields = <T extends Record<string, unknown>>(updates: T, protectedFields: string[]): Omit<T, string> => {
  const safeUpdates: Record<string, unknown> = { ...updates };
  protectedFields.forEach(field => delete safeUpdates[field]);
  return safeUpdates as Omit<T, string>;
};

const sortPromptsByUpdatedAt = (prompts: Prompt[]): Prompt[] => {
  return prompts.sort((a, b) => {
    const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt || 0).getTime();
    const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt || 0).getTime();
    return timeB - timeA;
  });
};

const sortProjectsByCreatedAt = (projects: Project[]): Project[] => {
  return projects.sort((a, b) => {
    const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
    const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
};

// Prompt Services
export const promptService = {
  // Get all prompts for current user
  async getAll(): Promise<Prompt[]> {
    const userId = getCurrentUserId();
    const q = query(
      collection(db, COLLECTIONS.PROMPTS),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const prompts = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: convertTimestamp(docSnap.data().createdAt),
      updatedAt: convertTimestamp(docSnap.data().updatedAt)
    })) as Prompt[];
    return sortPromptsByUpdatedAt(prompts);
  },

  // Get prompts by project for current user
  async getByProject(projectName: string): Promise<Prompt[]> {
    const userId = getCurrentUserId();
    const q = query(
      collection(db, COLLECTIONS.PROMPTS),
      where("userId", "==", userId),
      where("project", "==", projectName)
    );
    const querySnapshot = await getDocs(q);
    const prompts = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: convertTimestamp(docSnap.data().createdAt),
      updatedAt: convertTimestamp(docSnap.data().updatedAt)
    })) as Prompt[];
    return sortPromptsByUpdatedAt(prompts);
  },

  // Get favorite prompts for current user
  async getFavorites(): Promise<Prompt[]> {
    const userId = getCurrentUserId();
    const q = query(
      collection(db, COLLECTIONS.PROMPTS),
      where("userId", "==", userId),
      where("isFavorite", "==", true)
    );
    const querySnapshot = await getDocs(q);
    const prompts = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: convertTimestamp(docSnap.data().createdAt),
      updatedAt: convertTimestamp(docSnap.data().updatedAt)
    })) as Prompt[];
    return sortPromptsByUpdatedAt(prompts);
  },

  // Search prompts for current user
  async search(searchTerm: string): Promise<Prompt[]> {
    const allPrompts = await this.getAll();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return allPrompts.filter(prompt => 
      prompt.title.toLowerCase().includes(lowerSearchTerm) ||
      prompt.content.toLowerCase().includes(lowerSearchTerm) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
    );
  },

  // Add new prompt
  async add(prompt: Omit<Prompt, "id"> & { id: string }): Promise<string> {
    const userId = getCurrentUserId();
    await createIfAbsent(COLLECTIONS.PROMPTS, prompt.id, {
      ...prompt,
      userId,
      createdAt: convertToTimestamp(prompt.createdAt),
      updatedAt: convertToTimestamp(prompt.updatedAt)
    });
    return prompt.id;
  },

  // Update prompt
  async update(id: string, updates: Partial<Prompt>): Promise<void> {
    getCurrentUserId();
    const docRef = doc(db, COLLECTIONS.PROMPTS, id);
    const updateData = {
      ...withoutProtectedFields(updates as Record<string, unknown>, ["id", "userId", "createdAt"]),
      updatedAt: convertToTimestamp(new Date())
    };
    await updateDoc(docRef, updateData);
  },

  // Delete prompt
  async delete(id: string): Promise<void> {
    console.log("Attempting to delete prompt with ID:", id);
    try {
      const docRef = doc(db, COLLECTIONS.PROMPTS, id);
      await deleteDoc(docRef);
      console.log("Successfully deleted prompt with ID:", id);
    } catch (error) {
      console.error("Error deleting prompt:", error);
      throw error;
    }
  },

  // Toggle favorite
  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    await this.update(id, { isFavorite });
  },

  // Increment usage count
  async incrementUsage(id: string): Promise<void> {
    getCurrentUserId();
    await updateDoc(doc(db, COLLECTIONS.PROMPTS, id), { usageCount: increment(1), updatedAt: convertToTimestamp(new Date()) });
  },

  // Real-time listener for prompts with safe in-memory sorting & error handling
  subscribeToPrompts(callback: (prompts: Prompt[]) => void, onError?: (error: any) => void) {
    const userId = getCurrentUserId();
    const q = query(
      collection(db, COLLECTIONS.PROMPTS),
      where("userId", "==", userId)
    );
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const prompts = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: convertTimestamp(docSnap.data().createdAt),
          updatedAt: convertTimestamp(docSnap.data().updatedAt)
        })) as Prompt[];
        callback(sortPromptsByUpdatedAt(prompts));
      },
      (error) => {
        console.error("Firestore subscribeToPrompts error:", error);
        if (onError) onError(error);
      }
    );
  }
};

// Project Services
export const projectService = {
  // Get all projects for current user
  async getAll(): Promise<Project[]> {
    const userId = getCurrentUserId();
    const q = query(
      collection(db, COLLECTIONS.PROJECTS),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const projects = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: convertTimestamp(docSnap.data().createdAt)
    })) as Project[];
    return sortProjectsByCreatedAt(projects);
  },

  // Add new project
  async add(project: Omit<Project, "id"> & { id: string }): Promise<string> {
    const userId = getCurrentUserId();
    await createIfAbsent(COLLECTIONS.PROJECTS, project.id, {
      ...project,
      userId,
      createdAt: convertToTimestamp(project.createdAt)
    });
    return project.id;
  },

  // Update project
  async update(id: string, updates: Partial<Project>): Promise<void> {
    getCurrentUserId();
    const docRef = doc(db, COLLECTIONS.PROJECTS, id);
    await updateDoc(docRef, withoutProtectedFields(updates as Record<string, unknown>, ["id", "userId", "createdAt"]));
  },

  // Delete project and all associated prompts
  async delete(id: string): Promise<void> {
    console.log("ProjectService: Attempting to delete project with ID:", id);
    try {
      const userId = getCurrentUserId();
      const batch = writeBatch(db);
      
      const projectDoc = await getDoc(doc(db, COLLECTIONS.PROJECTS, id));
      if (!projectDoc.exists()) {
        console.log("ProjectService: Project not found with ID:", id);
        return;
      }
      
      const projectData = projectDoc.data();
      if (projectData.userId !== userId) {
        throw new Error("Unauthorized: Cannot delete project owned by another user");
      }
      
      const projectName = projectData.name;
      console.log("ProjectService: Found project name:", projectName);
      
      const promptsQuery = query(
        collection(db, COLLECTIONS.PROMPTS),
        where("userId", "==", userId),
        where("project", "==", projectName)
      );
      const promptsSnapshot = await getDocs(promptsQuery);
      console.log("ProjectService: Found", promptsSnapshot.docs.length, "prompts to delete");
      
      promptsSnapshot.docs.forEach(docSnap => {
        const prompt = docSnap.data();
        if (prompt.userId === userId && prompt.project === projectName) batch.delete(docSnap.ref);
      });
      
      batch.delete(doc(db, COLLECTIONS.PROJECTS, id));
      await batch.commit();
      console.log("ProjectService: Successfully deleted project and associated prompts");
    } catch (error) {
      console.error("ProjectService: Error deleting project:", error);
      throw error;
    }
  },

  // Real-time listener for projects with safe in-memory sorting & error handling
  subscribeToProjects(callback: (projects: Project[]) => void, onError?: (error: any) => void) {
    const userId = getCurrentUserId();
    const q = query(
      collection(db, COLLECTIONS.PROJECTS),
      where("userId", "==", userId)
    );
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const projects = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: convertTimestamp(docSnap.data().createdAt)
        })) as Project[];
        callback(sortProjectsByCreatedAt(projects));
      },
      (error) => {
        console.error("Firestore subscribeToProjects error:", error);
        if (onError) onError(error);
      }
    );
  }
};

// Category Services
export const categoryService = {
  // Get all categories for current user
  async getAll(): Promise<Category[]> {
    const userId = getCurrentUserId();
    const q = query(
      collection(db, COLLECTIONS.CATEGORIES),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Category[];
  },

  // Get categories by project for current user
  async getByProject(projectId: string): Promise<Category[]> {
    const userId = getCurrentUserId();
    const q = query(
      collection(db, COLLECTIONS.CATEGORIES),
      where("userId", "==", userId),
      where("projectId", "==", projectId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Category[];
  },

  // Add new category
  async add(category: Omit<Category, "id"> & { id: string }): Promise<string> {
    const userId = getCurrentUserId();
    await createIfAbsent(COLLECTIONS.CATEGORIES, category.id, {
      ...category,
      userId
    });
    return category.id;
  },

  // Update category
  async update(id: string, updates: Partial<Category>): Promise<void> {
    getCurrentUserId();
    const docRef = doc(db, COLLECTIONS.CATEGORIES, id);
    await updateDoc(docRef, withoutProtectedFields(updates as Record<string, unknown>, ["id", "userId"]));
  },

  // Delete category
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CATEGORIES, id);
    await deleteDoc(docRef);
  },

  // Real-time listener for categories with error handling
  subscribeToCategories(callback: (categories: Category[]) => void, onError?: (error: any) => void) {
    const userId = getCurrentUserId();
    const q = query(
      collection(db, COLLECTIONS.CATEGORIES),
      where("userId", "==", userId)
    );
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const categories = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Category[];
        callback(categories);
      },
      (error) => {
        console.error("Firestore subscribeToCategories error:", error);
        if (onError) onError(error);
      }
    );
  }
};
