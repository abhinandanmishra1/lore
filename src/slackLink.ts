// Parse a Slack message permalink into the ids the Slack API needs to fetch it.
// Permalink shapes:
//   https://team.slack.com/archives/C0123/p1782456420191299
//   https://team.slack.com/archives/C0123/p1782456420191299?thread_ts=1782455398.320559&cid=C0123
// The `p<digits>` form is the message ts with the dot removed (last 6 digits are
// the microsecond part). A `thread_ts` query param means the link points at a
// reply inside a thread — read the whole thread for context.

export interface SlackLink {
  channelId: string;
  ts: string;
  threadTs?: string;
}

const ARCHIVE = /\/archives\/([A-Z0-9]+)\/p(\d{10})(\d{6})/;

export function parseSlackPermalink(url: string): SlackLink | null {
  const m = ARCHIVE.exec(url);
  if (!m) return null;
  const [, channelId, secs, micros] = m;
  const link: SlackLink = { channelId: channelId!, ts: `${secs}.${micros}` };

  const q = url.indexOf('?');
  if (q !== -1) {
    const params = new URLSearchParams(url.slice(q + 1));
    const thread = params.get('thread_ts');
    if (thread) link.threadTs = thread;
  }
  return link;
}

// Pull the first Slack permalink out of a free-text note (e.g. a #lore-inbox
// message that is just a forwarded link, or a link plus a comment).
export function findSlackPermalink(text: string): string | null {
  const m = /https?:\/\/[^\s]*\/archives\/[A-Z0-9]+\/p\d{16}[^\s]*/.exec(text);
  return m ? m[0] : null;
}
