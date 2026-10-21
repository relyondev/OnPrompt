import { PromptType } from '../types';

export interface AiModelOption {
  id: string;
  name: string;
  provider: string;
  icon: string;
  promptTypes: PromptType[];
}

const icon = (id: string) => `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${id}.svg`;

export const AI_MODELS: AiModelOption[] = [
  { id: 'openai', name: 'ChatGPT', provider: 'OpenAI', icon: icon('openai'), promptTypes: ['TXT_TO_TXT', 'TXT_TO_IMG', 'IMG_TO_IMG'] },
  { id: 'claude', name: 'Claude', provider: 'Anthropic', icon: icon('claude'), promptTypes: ['TXT_TO_TXT'] },
  { id: 'gemini', name: 'Gemini', provider: 'Google', icon: icon('gemini'), promptTypes: ['TXT_TO_TXT', 'TXT_TO_IMG', 'IMG_TO_IMG'] },
  { id: 'deepseek', name: 'DeepSeek', provider: 'DeepSeek', icon: icon('deepseek'), promptTypes: ['TXT_TO_TXT'] },
  { id: 'mistral', name: 'Mistral', provider: 'Mistral AI', icon: icon('mistral'), promptTypes: ['TXT_TO_TXT'] },
  { id: 'qwen', name: 'Qwen', provider: 'Alibaba', icon: icon('qwen'), promptTypes: ['TXT_TO_TXT'] },
  { id: 'grok', name: 'Grok', provider: 'xAI', icon: icon('grok'), promptTypes: ['TXT_TO_TXT', 'TXT_TO_IMG'] },
  { id: 'dalle', name: 'DALLÂ·E', provider: 'OpenAI', icon: icon('dalle'), promptTypes: ['TXT_TO_IMG', 'IMG_TO_IMG'] },
  { id: 'midjourney', name: 'Midjourney', provider: 'Midjourney', icon: icon('midjourney'), promptTypes: ['TXT_TO_IMG', 'IMG_TO_IMG'] },
  { id: 'flux', name: 'FLUX', provider: 'Black Forest Labs', icon: icon('flux'), promptTypes: ['TXT_TO_IMG', 'IMG_TO_IMG'] },
  { id: 'stability', name: 'Stable Diffusion', provider: 'Stability AI', icon: icon('stability'), promptTypes: ['TXT_TO_IMG', 'IMG_TO_IMG'] },
  { id: 'adobefirefly', name: 'Firefly', provider: 'Adobe', icon: icon('adobefirefly'), promptTypes: ['TXT_TO_IMG', 'IMG_TO_IMG'] },
  { id: 'runway', name: 'Runway', provider: 'Runway', icon: icon('runway'), promptTypes: ['TXT_TO_IMG', 'IMG_TO_IMG'] },
  { id: 'kling', name: 'Kling', provider: 'Kling AI', icon: icon('kling'), promptTypes: ['TXT_TO_IMG', 'IMG_TO_IMG'] },
  { id: 'luma', name: 'Luma', provider: 'Luma AI', icon: icon('luma'), promptTypes: ['TXT_TO_IMG', 'IMG_TO_IMG'] },
];

export const getAiModel = (id?: string): AiModelOption | undefined => AI_MODELS.find(model => model.id === id);
export const getAiModels = (ids?: string[]): AiModelOption[] => (ids || []).map(id => getAiModel(id)).filter((model): model is AiModelOption => Boolean(model));
