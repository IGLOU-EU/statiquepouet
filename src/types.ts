export interface Config {
  /** ID of the div that hosts the comments. */
  commentsContainerId: string;
  /** Language code, falls back via `resolveLang()`. */
  lang?: string;
  /** Project root, used to locate `lang/*.json` and `dist/comments.min.js`. */
  basePath?: string;
}

/** Dictionary of translated strings. */
export type Strings = Record<string, string>;

/** Parsed representation of a Mastodon (or compatible) toot URL. */
export interface ParsedToot {
  instance: string;
  statusId: string;
  url: string;
}

/** Subset of the Mastodon account fields used for rendering. */
export interface MastodonAccount {
  acct: string;
  url: string;
  display_name?: string;
  username?: string;
  avatar?: string;
}

/** Subset of the Mastodon Status fields used by this library. */
export interface MastodonStatus {
  id: string;
  url: string;
  content: string;
  created_at: string;
  in_reply_to_id: string | null;
  account: MastodonAccount;
}

/** Response of the `/api/v1/statuses/:id/context` endpoint. */
export interface ContextResponse {
  ancestors: MastodonStatus[];
  descendants: MastodonStatus[];
}

/** Threading tree node, reconstructed from the flat descendants array. */
export interface TreeNode {
  status: MastodonStatus | null;
  replies: TreeNode[];
}

/** Webfinger JRD document. */
export interface JRD {
  links?: JRDLink[];
}

export interface JRDLink {
  rel: string;
  template?: string;
  href?: string;
}

/** FEP-3b86 + legacy OStatus rels used for the various intents. */
export const REL_FEP_OBJECT = 'https://w3id.org/fep/3b86/Object';
export const REL_FEP_CREATE = 'https://w3id.org/fep/3b86/Create';
export const REL_OSTATUS_SUBSCRIBE = 'http://ostatus.org/schema/1.0/subscribe';
