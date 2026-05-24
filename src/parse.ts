// Toot URL parsing and instance domain validation.

import type { ParsedToot } from './types.js';

/**
 * Recognized formats:
 *   https://instance/@user/123                   (Mastodon snowflake)
 *   https://instance/@user@other/123             (federated)
 *   https://instance/users/user/statuses/123     (ActivityPub URI)
 *   https://instance/notice/B6Yx2…               (Pleroma FlakeID)
 *   https://instance/@user/statuses/01H8E2X5…    (GoToSocial ULID)
 */
export function parseTootUrl(content: unknown): ParsedToot | null {
  if (typeof content !== 'string') return null;
  let u: URL;
  try {
    u = new URL(content.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const segs = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
  if (segs.length < 2) return null;
  const last = segs[segs.length - 1]!;
  if (!/^[A-Za-z0-9_-]+$/.test(last)) return null;
  return {
    instance: u.host,
    statusId: last,
    url: u.origin + '/' + segs.join('/'),
  };
}

/** Normalize a user-supplied domain (protocol, trailing slash, case). */
export function normalizeInstance(domain: unknown): string {
  return String(domain ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

/** Check whether a string looks like a valid instance domain. */
export function isValidInstance(domain: unknown): boolean {
  if (typeof domain !== 'string') return false;
  const d = normalizeInstance(domain);
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?::\d{1,5})?$/.test(d);
}

/**
 * Returns `@user@instance` from a toot URL, or null when the path has
 * no username (Pleroma `/notice/:id` style).
 *
 *   /@user/:id               -> @user@<host>
 *   /@user@other/:id         -> @user@other
 *   /users/user/statuses/:id -> @user@<host>
 */
export function extractAuthorHandle(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const segs = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
  if (segs.length < 2) return null;

  const first = segs[0]!;
  if (first.startsWith('@')) {
    const handlePart = first.slice(1);
    if (handlePart.length === 0) return null;
    return handlePart.includes('@') ? `@${handlePart}` : `@${handlePart}@${u.host}`;
  }
  if (first === 'users' && segs[1] && segs[2] === 'statuses') {
    return `@${segs[1]}@${u.host}`;
  }
  return null;
}
