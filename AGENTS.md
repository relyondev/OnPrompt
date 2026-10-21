# OnPrompt — Agent Guide & Quick Context

This file provides instant context for AI coding agents (Antigravity, Claude Code, Cursor, Copilot, etc.) working on this repository.

---

## 1. Quick Project Facts
- **Project Name:** On Prompt
- **Live URL:** https://relyon-onprompt.web.app
- **Local Path:** `C:\Users\mchlh\.gemini\antigravity\scratch\on-prompt`
- **Tech Stack:** React 18, TypeScript, Tailwind CSS 3, Vite 5, Firebase Modular SDK v10
- **Firebase Project ID:** `relyon-app`
- **Hosting Site Target:** `relyon-onprompt`

---

## 2. Essential Commands

| Action | Command |
| :--- | :--- |
| **Install Dependencies** | `npm install` |
| **Development Server** | `npm run dev` |
| **Run Tests** | `npm test` *(Vitest 1.6)* |
| **Build for Production** | `npm run build` *(Outputs to `dist/`)* |
| **Deploy Hosting & Rules** | `npx firebase-tools deploy --only "firestore:rules,hosting:relyon-onprompt" --project relyon-app` |

---

## 3. Architecture Map
- `src/App.tsx`: Main dashboard, feed switching, state coordination, and real-time listeners.
- `src/types.ts`: Central TypeScript definitions (`Prompt`, `Project`, `Category`, `PromptType`, etc.).
- `src/config/firebase.ts`: Firebase client app, Auth, Firestore, and Storage initialization.
- `src/contexts/AuthContext.tsx`: Google & Google Workspace SSO with `drive.file` scope.
- `src/services/dataService.ts`: Data orchestrator with Firestore and `localStorage` fallback.
- `src/services/firebaseService.ts`: Low-level Firestore queries and batch deletion operations.
- `src/services/googleDriveService.ts`: Multipart Drive v3 upload/load engine for prompt attachments.
- `src/components/`: Modular UI components (`PromptCard`, `CategoryGrid`, `SearchHeader`, `PromptForm`, `LoginForm`, `BottomNav`, `Sidebar`).
- `firestore.rules`: User-scoped security rules (`request.auth.uid == resource.data.userId`).
- `audit-report.md` / `audit-report.json`: Architectural and security audit documentation.

---

## 4. Key Rules for Agents
1. **Never hardcode secrets:** Use `src/config/firebase.ts` or environment configurations.
2. **Preserve dual-storage compatibility:** All prompt operations must go through `dataService.ts`.
3. **Enforce user scoping:** Any new Firestore queries must filter by `where("userId", "==", auth.currentUser.uid)`.
4. **Run tests before deploying:** Always verify `npm test` and `npm run build` pass before triggering Firebase deploy.
5. **Brand Identity & Design Tokens:** Follow `on-prompt-brand-guidelines.json` v1.0.0. Never alter the vector robot master geometry (`src/components/OnPromptLogo.tsx` and `/brand/on-prompt.svg`). Use `Plus Jakarta Sans` typography and semantic CSS tokens (`--op-bg`, `--op-surface`, `--op-action`, etc.).
