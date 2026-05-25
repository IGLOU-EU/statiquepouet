// Misskey family (Misskey, Sharkey, Iceshrimp, Firefish, Foundkey, Calckey).
//
// No FEP-3b86 templates, OStatus subscribe is follow-only. Their
// `/share` SPA accepts `replyUri`, `renoteUri`, `text`, `url`,
// `visibility`, etc. as query params.
//
// https://misskey-hub.net/docs/for-users/features/share-form/
// https://github.com/misskey-dev/misskey/blob/develop/packages/frontend/src/pages/share.vue

import type { IntentAdapter } from './types.js';
import type { JRD } from '../types.js';
import { REL_OSTATUS_SUBSCRIBE } from '../types.js';
import { findTemplateLink } from '../jrd.js';

export const MisskeyAdapter: IntentAdapter = {
  name: 'misskey',

  resolveReplyUrl(userInstance, tootUrl) {
    return `https://${userInstance}/share?replyUri=${encodeURIComponent(tootUrl)}`;
  },

  resolveShareUrl(userInstance, text) {
    return `https://${userInstance}/share?text=${encodeURIComponent(text)}`;
  },
};

/**
 * Misskey advertises `/authorize-follow` (hyphen) in its OStatus
 * subscribe template. Mastodon uses `authorize_interaction`
 * (underscore), Pleroma uses `ostatus_subscribe`.
 *
 * Rarely fires in practice because real Misskey servers 404 on the
 * instance-actor webfinger we query for dispatch. Kept as a defensive
 * layer and as the authoritative match when a JRD is available.
 */
export function isMisskeyJRD(jrd: JRD): boolean {
  const tpl = findTemplateLink(jrd, REL_OSTATUS_SUBSCRIBE);
  if (!tpl) return false;
  try {
    return new URL(tpl).pathname.toLowerCase().includes('authorize-follow');
  } catch {
    return false;
  }
}

const MISSKEY_FAMILY: ReadonlySet<string> = new Set([
  'misskey',
  'sharkey',
  'firefish',
  'iceshrimp',
  'foundkey',
  'calckey',
]);

/** Case-insensitive lookup against nodeinfo `software.name`. */
export function isMisskeySoftware(software: string): boolean {
  return MISSKEY_FAMILY.has(software.toLowerCase());
}
