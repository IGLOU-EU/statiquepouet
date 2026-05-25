// Mastodon Client API family (Mastodon, Pleroma/Akkoma, GoToSocial, Pixelfed).
//
// Reply: FEP-3b86 `Object` template, then OStatus subscribe (unless
// follow-only), then hardcoded `/authorize_interaction?uri=…`.
// Share: FEP-3b86 `Create` template, then `/share?text=…`.
//
// FEP-3b86: https://w3id.org/fep/3b86
// Mastodon: app/controllers/authorize_interactions_controller.rb

import type { IntentAdapter } from './types.js';
import {
  REL_FEP_OBJECT,
  REL_FEP_CREATE,
  REL_OSTATUS_SUBSCRIBE,
} from '../types.js';
import { findTemplateLink, buildIntentUrl } from '../jrd.js';
import { buildAuthorizeUrl, buildShareUrl } from '../urls.js';

export const DefaultAdapter: IntentAdapter = {
  name: 'default',

  resolveReplyUrl(userInstance, tootUrl, jrd) {
    if (jrd) {
      const obj = findTemplateLink(jrd, REL_FEP_OBJECT);
      if (obj) {
        const url = buildIntentUrl(obj, 'object', tootUrl);
        if (url) return url;
      }
      const ostatus = findTemplateLink(jrd, REL_OSTATUS_SUBSCRIBE);
      if (ostatus && !isFollowOnlyTemplate(ostatus)) {
        const url = buildIntentUrl(ostatus, 'uri', tootUrl);
        if (url) return url;
      }
    }
    return buildAuthorizeUrl(userInstance, tootUrl);
  },

  resolveShareUrl(userInstance, text, jrd) {
    if (jrd) {
      const tpl = findTemplateLink(jrd, REL_FEP_CREATE);
      if (tpl) {
        const url = buildIntentUrl(tpl, 'content', text);
        if (url) return url;
      }
    }
    return buildShareUrl(userInstance, text);
  },
};

/**
 * Misskey publishes `/authorize-follow?acct={uri}` as its OStatus
 * subscribe template. Substituting a status URI into it would trigger
 * a follow flow rather than a reply, so we filter that out.
 */
export function isFollowOnlyTemplate(template: string): boolean {
  try {
    return new URL(template).pathname.toLowerCase().includes('follow');
  } catch {
    return false;
  }
}
