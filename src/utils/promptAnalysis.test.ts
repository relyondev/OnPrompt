import { describe, it, expect } from 'vitest';
import { analyzePrompt } from './promptAnalysis';

describe('promptAnalysis heuristic engine', () => {
  it('analyzes empty prompt safely', () => {
    const result = analyzePrompt('');
    expect(result.wordCount).toBe(0);
    expect(result.characterCount).toBe(0);
    expect(result.estimatedTokens).toBe(0);
  });

  it('calculates word count and estimated tokens', () => {
    const prompt = 'Act as an expert software architect and design a scalable system.';
    const result = analyzePrompt(prompt);
    expect(result.wordCount).toBe(11);
    expect(result.characterCount).toBe(prompt.length);
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it('generates suggestions for prompts needing structure', () => {
    const prompt = 'Do this task with that and it should be good.';
    const result = analyzePrompt(prompt);
    expect(result.suggestions).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
  });
});
