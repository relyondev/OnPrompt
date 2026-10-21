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

describe('dataService authentication safeguards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses an isolated Firebase configuration during the test run', () => {
    expect(isFirebaseConfigured()).toBe(true);
  });

  it('does not silently fall back to localStorage when Firebase is configured but unauthenticated', async () => {
    await expect(dataService.getPrompts()).rejects.toMatchObject({ code: 'auth-required' });
  });

  it('does not report unauthenticated cloud saves as successful', async () => {
    await expect(dataService.addPrompt({
      title: 'Test Prompt',
      content: 'Hello World',
      tags: ['test'],
      usageCount: 0,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })).rejects.toMatchObject({ code: 'auth-required' });
  });
});
