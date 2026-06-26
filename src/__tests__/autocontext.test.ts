import { describe, it, expect } from 'vitest';
import { extractTicket } from '../autocontext.js';

describe('extractTicket', () => {
  it('pulls a ticket from the team branch convention', () => {
    expect(extractTicket('PROJ-1495-fix-api-call-issue')).toBe('PROJ-1495');
  });
  it('matches a ticket anywhere in the branch', () => {
    expect(extractTicket('feature/PROJ-22-thing')).toBe('PROJ-22');
  });
  it('returns null when no ticket is present', () => {
    expect(extractTicket('main')).toBeNull();
    expect(extractTicket('quick-fix')).toBeNull();
  });
  it('returns null for a null branch', () => {
    expect(extractTicket(null)).toBeNull();
  });
  it('does not match lowercase project keys', () => {
    expect(extractTicket('proj-12-nope')).toBeNull();
  });
});
