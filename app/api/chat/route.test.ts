import { describe, it, expect } from 'vitest';
import { pickModel } from './route';

describe('pickModel', () => {
  it('returns claude-sonnet-4-6 by default', () => {
    const messages = [
      { role: 'user', content: 'Hello, how do I set up my welder?' }
    ];
    expect(pickModel(messages)).toBe('claude-sonnet-4-6');
  });

  it('returns claude-opus-4-7 when diagram/wiring keywords are present', () => {
    const messages = [
      { role: 'user', content: 'Can you show me a wiring diagram for DCEN?' }
    ];
    expect(pickModel(messages)).toBe('claude-opus-4-7');
  });

  it('returns claude-opus-4-7 for polarity questions', () => {
    const messages = [
      { role: 'user', content: 'What is the correct polarity for flux-cored welding?' }
    ];
    expect(pickModel(messages)).toBe('claude-opus-4-7');
  });

  it('ignores assistant messages and only checks user messages for SVG keywords', () => {
    const messages = [
      { role: 'assistant', content: 'I can provide a wiring diagram if you need.' },
      { role: 'user', content: 'Just tell me the settings for MIG welding.' }
    ];
    // Assistant message has "wiring diagram" but user message doesn't
    expect(pickModel(messages)).toBe('claude-sonnet-4-6');
  });

  it('checks the latest user message', () => {
    const messages = [
      { role: 'user', content: 'Show me the polarity diagram.' },
      { role: 'assistant', content: 'Here is the polarity diagram.' },
      { role: 'user', content: 'Thanks, what is the duty cycle?' }
    ];
    // The latest user message does not contain SVG keywords, but a previous one did.
    // The current implementation of pickModel uses the LAST user message.
    expect(pickModel(messages)).toBe('claude-sonnet-4-6');
  });
});
