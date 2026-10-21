# Source Code Verification Report — On Prompt by Relyon Dev

**Project:** On Prompt by Relyon Dev  
**Live Application:** [https://relyon-onprompt.web.app](https://relyon-onprompt.web.app)  
**Verification Date:** October 22, 2026  
**Document Purpose:** Architectural and security verification of core persistence, authentication, and external integration mechanisms.

---

## Table of Contents
1. [Firestore Security Rules (`firestore.rules`)](#1-firestore-security-rules-firestorerules)
2. [Data Storage Orchestrator & Fallback (`dataService.ts`)](#2-data-storage-orchestrator--fallback-dataservicets)
3. [Firestore CRUD Service (`firebaseService.ts`)](#3-firestore-crud-service-firebaseservicets)
4. [Authentication & Token Lifecycle (`AuthContext.tsx`)](#4-authentication--token-lifecycle-authcontexttsx)
5. [Google Drive Media Engine (`googleDriveService.ts`)](#5-google-drive-media-engine-googledriveservicets)
6. [Summary Verification Matrix](#6-summary-verification-matrix)

---

## 1. Firestore Security Rules (`firestore.rules`)

### Architectural Role
Controls server-side authorization boundaries directly on Google Cloud Firestore, ensuring multi-tenant isolation across `prompts`, `projects`, and `categories`.

### Security Verification
- **Read / Update / Delete:** Guaranteed user-isolation by verifying `resource.data.userId == request.auth.uid`. Unauthenticated users or users with mismatched UIDs receive `PERMISSION_DENIED`.
- **Create:** Enforces ownership assignment via `request.resource.data.userId == request.auth.uid`, preventing users from injecting documents into other users' namespaces.

### Source Code Implementation
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // User-scoped prompts collection
    match /prompts/{promptId} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    // User-scoped projects collection
    match /projects/{projectId} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }

    // User-scoped categories collection
    match /categories/{categoryId} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 2. Data Storage Orchestrator & Fallback (`dataService.ts`)

### Architectural Role
Acts as the central abstraction layer between UI components and physical storage engines. Coordinates between cloud-synchronized Firestore and client-side browser `localStorage`.

### Security & Operational Verification
- **Conditional Routing:** Evaluates `shouldUseFirestore()` based on API key validity and active authenticated session (`auth.currentUser`).
- **Silent Fallback:** If Firestore calls throw errors (network partitioning, offline state, or quota limits), operations catch the error and fall back to `localStorage`.
- **Risk Consideration:** When operating in offline/fallback mode, prompt data resides unencrypted in the browser's `localStorage` until synchronized back via `syncLocalToCloud()`.

### Source Code Implementation
```typescript
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

  isUsingFirestore(): boolean {
    return shouldUseFirestore();
  },

  isUsingLocalStorage(): boolean {
    return !shouldUseFirestore();
  }
};
```

---

## 3. Firestore CRUD Service (`firebaseService.ts`)

### Architectural Role
Executes parameterized queries and mutations against Firestore collections, converting between JavaScript `Date` instances and Firestore `Timestamp` objects.

### Security & Operational Verification
- **Scoping Invariant:** Every query (`getAll`, `getByProject`, `getFavorites`, `subscribeToPrompts`) explicitly applies `where("userId", "==", userId)`.
- **Atomic Creation:** `promptService.add` uses `setDoc` with the document ID, injecting `userId: auth.currentUser.uid`.
- **Timestamp Integrity:** `convertToTimestamp` normalizes dates to Google Cloud `Timestamp.fromDate()`.
- **Cascade Deletion:** `projectService.delete` uses `writeBatch(db)` to delete all prompts referencing `projectName` before removing the project document itself.

### Source Code Implementation
```typescript
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
  setDoc
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { Prompt, Project, Category } from "../types";

const COLLECTIONS = {
  PROMPTS: "prompts",
  PROJECTS: "projects",
  CATEGORIES: "categories"
};

const getCurrentUserId = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user.uid;
};

const convertTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (typeof timestamp?.toDate === "function") return timestamp.toDate();
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? new Date() : date;
};

const convertToTimestamp = (date: any): Timestamp => {
  if (date instanceof Timestamp) return date;
  if (typeof date?.toDate === "function") return date;
  if (date instanceof Date && !isNaN(date.getTime())) return Timestamp.fromDate(date);
  if (typeof date === "string" || typeof date === "number") {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) return Timestamp.fromDate(parsed);
  }
  return Timestamp.now();
};

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

  // Add new prompt (Creation)
  async add(prompt: Omit<Prompt, "id"> & { id: string }): Promise<string> {
    const userId = getCurrentUserId();
    await setDoc(doc(collection(db, COLLECTIONS.PROMPTS), prompt.id), {
      ...prompt,
      userId,
      createdAt: convertToTimestamp(prompt.createdAt),
      updatedAt: convertToTimestamp(prompt.updatedAt)
    });
    return prompt.id;
  },

  // Update prompt (Editing)
  async update(id: string, updates: Partial<Prompt>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PROMPTS, id);
    const updateData = {
      ...updates,
      updatedAt: convertToTimestamp(new Date())
    };
    await updateDoc(docRef, updateData);
  },

  // Delete prompt (Deletion)
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PROMPTS, id);
    await deleteDoc(docRef);
  },

  // Real-time listener for prompts with safe in-memory sorting
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
```

---

## 4. Authentication & Token Lifecycle (`AuthContext.tsx`)

### Architectural Role
Provides application-wide state for authenticated users, handles Google OAuth SSO popup flows, requests Google Drive authorization scopes, and manages the token lifecycle.

### Security & Operational Verification
- **Principle of Least Privilege:** Requests `https://www.googleapis.com/auth/drive.file` scope only (grants access solely to files created/opened by On Prompt, not the user's entire drive).
- **Session Token Isolation:** Uses `sessionStorage` (`prompt-manager-drive-token`) to retain the OAuth token for the duration of the browser tab.
- **Teardown on Sign-Out:** Listens to `onAuthStateChanged`. When a user logs out or switches accounts, `driveAccessToken` is scrubbed from state and `sessionStorage`.

### Source Code Implementation
```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  connectGoogleDrive: () => Promise<string>;
  driveAccessToken: string | null;
  isGoogleUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(() => 
    sessionStorage.getItem('prompt-manager-drive-token')
  );

  const login = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string): Promise<void> => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const completeGoogleAuth = (result: UserCredential) => {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setDriveAccessToken(credential.accessToken);
      sessionStorage.setItem('prompt-manager-drive-token', credential.accessToken);
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    const result = await signInWithPopup(auth, provider);
    completeGoogleAuth(result);
  };

  const connectGoogleDrive = async (): Promise<string> => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    const result = await signInWithPopup(auth, provider);
    completeGoogleAuth(result);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google did not return a Drive access token. Please reconnect Google Drive.');
    }
    return credential.accessToken;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user?.providerData.some(provider => provider.providerId === 'google.com')) {
        setDriveAccessToken(null);
        sessionStorage.removeItem('prompt-manager-drive-token');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    loginWithGoogle,
    connectGoogleDrive,
    driveAccessToken,
    isGoogleUser: Boolean(currentUser?.providerData.some(provider => provider.providerId === 'google.com')),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
```

---

## 5. Google Drive Media Engine (`googleDriveService.ts`)

### Architectural Role
Handles image attachments directly against the Google Drive v3 REST API via multipart upload and authenticated binary stream downloading.

### Privacy & Accessibility Verification
- **Private by Default:** Files are uploaded to an application-specific folder (`On Prompt`) inside the user's private Google Drive storage. No public sharing permissions (`anyoneWithLink`) are granted.
- **Controlled Binary Access:** Media display does not rely on public hotlinks; images are fetched via an authenticated stream (`GET /drive/v3/files/{id}?alt=media` with `Authorization: Bearer ${token}`) and rendered in-memory using `URL.createObjectURL(blob)`.
- **Upload Validation:** Enforces MIME type check (`file.type.startsWith('image/')`) and a 10 MB file size limit before initiating network requests.

### Source Code Implementation
```typescript
import { PromptAttachment } from '../types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

async function driveRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.error?.message || body?.error?.errors?.[0]?.message || '';
    } catch {
      detail = await response.text().catch(() => '');
    }
    if (response.status === 401) throw new Error('Your Google Drive connection expired. Reconnect Google Drive and try again.');
    if (response.status === 403 && detail.toLowerCase().includes('api has not been used')) {
      throw new Error('Google Drive API is not enabled for this project. Enable it in Google Cloud, then reconnect Google Drive.');
    }
    if (response.status === 403) throw new Error(`Google Drive denied access${detail ? `: ${detail}` : '. Check the Drive API and OAuth consent settings.'}`);
    throw new Error(`Google Drive request failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
  return response.json() as Promise<T>;
}

async function getOrCreateAppFolder(token: string): Promise<string> {
  const query = encodeURIComponent(`name = 'On Prompt' and mimeType = '${FOLDER_MIME}' and trashed = false`);
  const existing = await driveRequest<{ files: Array<{ id: string }> }>(`${DRIVE_API}?q=${query}&spaces=drive&fields=files(id)`, token);
  if (existing.files[0]?.id) return existing.files[0].id;
  const folder = await driveRequest<{ id: string }>(DRIVE_API, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'On Prompt', mimeType: FOLDER_MIME }),
  });
  return folder.id;
}

export async function uploadImageToDrive(file: File, promptId: string, token: string): Promise<PromptAttachment> {
  if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be smaller than 10 MB.');

  const folderId = await getOrCreateAppFolder(token);
  const boundary = `prompt-manager-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: `${promptId}-${file.name}`,
    mimeType: file.type,
    parents: [folderId],
    description: `On Prompt attachment for prompt ${promptId}`,
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`, file,
    `\r\n--${boundary}--`,
  ]);

  const uploaded = await driveRequest<{ id: string; name: string; mimeType: string; size?: string; webViewLink?: string }>(
    `${UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,size,webViewLink`, 
    token, 
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );

  return { 
    id: uploaded.id, 
    name: uploaded.name, 
    mimeType: uploaded.mimeType, 
    size: Number(uploaded.size || file.size), 
    driveFileId: uploaded.id, 
    webViewLink: uploaded.webViewLink 
  };
}

export async function loadDriveImage(fileId: string, token: string): Promise<string> {
  const response = await fetch(`${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Unable to load image (${response.status})`);
  return URL.createObjectURL(await response.blob());
}
```

---

## 6. Summary Verification Matrix

| Component | Target File | Verification Finding | Status |
| :--- | :--- | :--- | :--- |
| **Document Security Rules** | `firestore.rules` | User UID matching enforced across all collections (`prompts`, `projects`, `categories`). | Verified |
| **Storage Fallback Strategy** | `src/services/dataService.ts` | Dual-engine failover mechanism to browser `localStorage` on Firestore error/offline. | Verified |
| **Firestore CRUD Engine** | `src/services/firebaseService.ts` | Complete create, edit, delete with batch cascade deletions and user scoping queries. | Verified |
| **Authentication & Drive OAuth** | `src/contexts/AuthContext.tsx` | Scoped Google SSO (`drive.file`), session-based token storage, auto-clearing on logout. | Verified |
| **Drive Attachment Privacy** | `src/services/googleDriveService.ts` | Private multi-part upload inside user Drive; secure blob streaming via bearer token. | Verified |
