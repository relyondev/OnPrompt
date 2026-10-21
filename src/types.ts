export type PromptType = 'TXT_TO_TXT' | 'TXT_TO_IMG' | 'IMG_TO_IMG';

export type PromptFormat = 'general' | 'json' | 'structured';

export interface PromptVariants {
  general?: string;
  json?: string;
  structured?: string;
}

export interface PromptAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  driveFileId: string;
  webViewLink?: string;
  role?: 'reference' | 'result';
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  project?: string;
  category?: string;
  tags?: string[];
  isFavorite?: boolean;
  usageCount: number;
  version: number;
  promptType?: PromptType;
  promptFormat?: PromptFormat;
  promptVariants?: PromptVariants;
  testedModel?: string;
  testedModels?: string[];
  attachments?: PromptAttachment[];
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId?: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  projectId?: string;
  userId?: string;
}


export interface PromptSuggestion {
  type: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PromptAnalysis {
  wordCount: number;
  characterCount: number;
  readabilityScore: number;
  suggestions: PromptSuggestion[];
  estimatedTokens: number;
}
