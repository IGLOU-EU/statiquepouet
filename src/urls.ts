/** Reply tree of a status (Mastodon Client API). */
export function buildContextUrl(instance: string, statusId: string): string {
  return `https://${instance}/api/v1/statuses/${statusId}/context`;
}

/** Mastodon legacy reply UI on the user's instance. */
export function buildAuthorizeUrl(userInstance: string, statusUrl: string): string {
  return `https://${userInstance}/authorize_interaction?uri=${encodeURIComponent(statusUrl)}`;
}

/** Instance autocomplete (Mastodon Client API). */
export function buildPeersSearchUrl(instance: string, query: string): string {
  return `https://${instance}/api/v1/peers/search?q=${encodeURIComponent(query)}`;
}

/** Webfinger for the instance actor (used for FEP-3b86 lookup). */
export function buildWebfingerUrl(instance: string): string {
  return `https://${instance}/.well-known/webfinger?resource=${encodeURIComponent('https://' + instance)}`;
}

/** Mastodon compose-toot fallback used by the share action. */
export function buildShareUrl(instance: string, text: string): string {
  return `https://${instance}/share?text=${encodeURIComponent(text)}`;
}

/** Instance descriptor. Used as a capability probe for the Mastodon Client API surface. */
export function buildInstanceInfoUrl(instance: string): string {
  return `https://${instance}/api/v1/instance`;
}

/**
 * Nodeinfo discovery. Lists supported schema versions (2.0, 2.1, …)
 * with hrefs to the actual documents. The caller follows the
 * highest-version link to read `software.name`.
 */
export function buildNodeinfoDiscoveryUrl(instance: string): string {
  return `https://${instance}/.well-known/nodeinfo`;
}
