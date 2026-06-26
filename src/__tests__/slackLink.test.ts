import { describe, it, expect } from 'vitest';
import { parseSlackPermalink, findSlackPermalink } from '../slackLink.js';

describe('parseSlackPermalink', () => {
  it('parses a plain message permalink (inserts the ts dot)', () => {
    const r = parseSlackPermalink('https://acme.slack.com/archives/C0BDBV8S1L2/p1782456420191299');
    expect(r).toEqual({ channelId: 'C0BDBV8S1L2', ts: '1782456420.191299' });
  });

  it('captures thread_ts when the link is a reply', () => {
    const r = parseSlackPermalink(
      'https://t.slack.com/archives/C0123ABCD/p1782456420191299?thread_ts=1782455398.320559&cid=C0123ABCD',
    );
    expect(r?.threadTs).toBe('1782455398.320559');
    expect(r?.ts).toBe('1782456420.191299');
  });

  it('returns null for a non-permalink', () => {
    expect(parseSlackPermalink('https://example.com/foo')).toBeNull();
    expect(parseSlackPermalink('just some text')).toBeNull();
  });
});

describe('findSlackPermalink', () => {
  it('extracts a link embedded in a note', () => {
    const note = 'lore: save this https://x.slack.com/archives/C9/p1782456420191299 it matters';
    expect(findSlackPermalink(note)).toBe('https://x.slack.com/archives/C9/p1782456420191299');
  });
  it('returns null when no link is present', () => {
    expect(findSlackPermalink('lore: a plain note')).toBeNull();
  });
});
