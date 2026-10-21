export const PREMADE_TAGS = [
  'writing',
  'coding',
  'marketing',
  'image-generation',
  'productivity',
  'research',
  'social-media',
  'brainstorming',
] as const;

export const TAG_PATTERN = /^[a-z0-9_-]+$/;

export const normalizeTag = (value: string): string =>
  value.trim().toLowerCase();

export const isValidTag = (value: string): boolean =>
  value.length > 0 && TAG_PATTERN.test(value);
