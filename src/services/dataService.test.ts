import { describe, it, expect, beforeEach } from 'vitest';

// Simple in-memory storage mock for node test runner
const storage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
  key: (i: number) => Object.keys(storage)[i] || null,
  length: 0
};

import { isFirebaseConfigured, dataService } from './dataService';

describe('dataService configuration & local fallback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('detects initialized Firebase config accurately', () => {
    expect(isFirebaseConfigured()).toBe(true);
  });

  it('falls back to localStorage when unauthenticated', async () => {
    const prompts = await dataService.getPrompts();
    expect(Array.isArray(prompts)).toBe(true);
  });

  it('adds and retrieves prompts in fallback mode', async () => {
    const id = await dataService.addPrompt({
      title: 'Test Prompt',
      content: 'Hello World',
      tags: ['test'],
      usageCount: 0,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(id).toBeDefined();
    const all = await dataService.getPrompts();
    expect(all.some(p => p.id === id)).toBe(true);
  });
});
