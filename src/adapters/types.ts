// Adapter interface for fediverse-software-specific intent dispatch.

import type { JRD } from '../types.js';

export interface IntentAdapter {
  /** Identifier used in logs and tests. */
  readonly name: string;

  /** Build the URL that opens the user's reply UI on their own instance. */
  resolveReplyUrl(userInstance: string, tootUrl: string, jrd: JRD | null): string;

  /** Build the URL that opens the user's compose UI, pre-filled with `text`. */
  resolveShareUrl(userInstance: string, text: string, jrd: JRD | null): string;
}
