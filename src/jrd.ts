// Pure helpers for Webfinger JRD documents and FEP-3b86 templates.
// Lives in its own module so intent.ts and adapters/* depend on it without a cycle.

import type { JRD } from './types.js';

/** First `links[*]` matching `rel`, or null. */
export function findTemplateLink(jrd: unknown, rel: string): string | null {
  if (jrd === null || typeof jrd !== 'object') return null;
  const links = (jrd as JRD).links;
  if (!Array.isArray(links)) return null;
  for (const link of links) {
    if (link && link.rel === rel && typeof link.template === 'string') {
      return link.template;
    }
  }
  return null;
}

/** URL-encode `resourceUrl` and substitute the `{param}` placeholder. */
export function buildIntentUrl(
  template: string | null | undefined,
  param: string | null | undefined,
  resourceUrl: string,
): string | null {
  if (typeof template !== 'string' || !template) return null;
  if (typeof param !== 'string' || !param) return null;
  return template.replace('{' + param + '}', encodeURIComponent(resourceUrl));
}
