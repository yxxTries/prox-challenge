import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './system-prompt';

describe('buildSystemPrompt', () => {
  it('returns a string containing the manual text', () => {
    const prompt = buildSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('VULCAN OMNIPRO 220 — COMPLETE MANUAL CONTENT');
    // Basic check that content was loaded
    expect(prompt.length).toBeGreaterThan(1000); 
  });

  it('contains the instructions for manual images', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('MANUAL DIAGRAM IMAGES (with what each one specifically shows)');
    expect(prompt).toContain('owner-manual-page-008.png'); // Should have parsed the manifest
  });

  it('contains the hard rules instructions', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Hard rules:');
    expect(prompt).toContain('Never wrap quoted manual text in double quotes.');
    expect(prompt).toContain('Never invent manual image filenames');
  });
});
