import { AiModelOption, AI_MODELS } from '../constants/models';
import { PREMADE_TAGS } from '../constants/tags';

interface StoredSettings {
  tags: string[];
  models: AiModelOption[];
}

const keyFor = (userId: string) => `prompt-manager-settings-${userId}`;

export const loadUserSettings = (userId: string): StoredSettings => {
  try {
    const stored = localStorage.getItem(keyFor(userId));
    if (!stored) return { tags: [...PREMADE_TAGS], models: AI_MODELS };
    const parsed = JSON.parse(stored) as Partial<StoredSettings>;
    return {
      tags: parsed.tags?.length ? parsed.tags : [...PREMADE_TAGS],
      models: parsed.models?.length ? parsed.models : AI_MODELS,
    };
  } catch {
    return { tags: [...PREMADE_TAGS], models: AI_MODELS };
  }
};

export const saveUserSettings = (userId: string, settings: StoredSettings): void => {
  localStorage.setItem(keyFor(userId), JSON.stringify(settings));
};
