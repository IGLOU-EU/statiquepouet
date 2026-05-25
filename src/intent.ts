// Three-step dispatch on the user's instance.
//   1. Webfinger JRD at `?resource=https://<instance>`.
//   2. Nodeinfo `software.name` lookup if the JRD pass kept the default adapter.
//   3. Mastodon Client API probe before trusting the default adapter's hardcoded fallback URL.

import type { JRD } from './types.js';
import {
  buildWebfingerUrl,
  buildInstanceInfoUrl,
  buildNodeinfoDiscoveryUrl,
} from './urls.js';
import { findAdapter, findAdapterBySoftware } from './adapters/finder.js';
import type { IntentAdapter } from './adapters/types.js';

export { findTemplateLink, buildIntentUrl } from './jrd.js';

/** Host responded but no signal lands it on a microblogging adapter (could also be CORS-blocked). */
export class UnsupportedInstanceError extends Error {
  readonly instance: string;
  constructor(instance: string) {
    super(`Instance "${instance}" is not a supported fediverse microblogging server`);
    this.name = 'UnsupportedInstanceError';
    this.instance = instance;
  }
}

/** DNS, TCP, or TLS failure. Distinguished from `UnsupportedInstanceError` by a no-cors probe. */
export class InstanceUnreachableError extends Error {
  readonly instance: string;
  constructor(instance: string) {
    super(`Instance "${instance}" could not be reached`);
    this.name = 'InstanceUnreachableError';
    this.instance = instance;
  }
}

const PROBE_TIMEOUT_MS = 5000;

/** Returns null on any failure. `context` distinguishes reply vs share in the warning log. */
async function fetchWebfingerJRD(
  instance: string,
  context: string,
): Promise<JRD | null> {
  try {
    const res = await fetch(buildWebfingerUrl(instance), {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (data === null || typeof data !== 'object') return null;
    return data as JRD;
  } catch (err) {
    console.warn(`[statique-pouet] webfinger fallback (${context}):`, err);
    return null;
  }
}

/** True iff `/api/v1/instance` returns 2xx. */
async function speaksMastodonApi(instance: string): Promise<boolean> {
  try {
    const res = await fetch(buildInstanceInfoUrl(instance), {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * `mode: 'no-cors'` makes fetch resolve opaquely on any HTTP response
 * (including CORS-stripped 4xx/5xx). It only rejects on DNS, TCP, or
 * TLS failure, so we use it to tell a dead host from a live one that
 * just filters our origin.
 */
async function isInstanceReachable(instance: string): Promise<boolean> {
  try {
    await fetch(`https://${instance}/`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return true;
  } catch {
    return false;
  }
}

/** Two-step nodeinfo discovery, lowercased software.name, null on any failure. */
async function fetchNodeinfoSoftwareName(instance: string): Promise<string | null> {
  try {
    const discoRes = await fetch(buildNodeinfoDiscoveryUrl(instance), {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!discoRes.ok) return null;
    const disco: unknown = await discoRes.json();
    const href = pickHighestNodeinfoHref(disco);
    if (!href) return null;

    const infoRes = await fetch(href, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!infoRes.ok) return null;
    const info: unknown = await infoRes.json();
    if (!info || typeof info !== 'object') return null;
    const software = (info as { software?: unknown }).software;
    if (!software || typeof software !== 'object') return null;
    const name = (software as { name?: unknown }).name;
    return typeof name === 'string' && name ? name.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Rel looks like `http://nodeinfo.diaspora.software/ns/schema/2.1`. Picks the highest version. */
function pickHighestNodeinfoHref(disco: unknown): string | null {
  if (!disco || typeof disco !== 'object') return null;
  const links = (disco as { links?: unknown }).links;
  if (!Array.isArray(links)) return null;

  const candidates: { version: string; href: string }[] = [];
  for (const link of links) {
    if (!link || typeof link !== 'object') continue;
    const rel = (link as { rel?: unknown }).rel;
    const href = (link as { href?: unknown }).href;
    if (typeof rel !== 'string' || typeof href !== 'string') continue;
    const m = /\/schema\/([\d.]+)$/.exec(rel);
    if (!m) continue;
    candidates.push({ version: m[1]!, href });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => compareSemver(b.version, a.version));
  return candidates[0]!.href;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number(n) || 0);
  const pb = b.split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function pickAdapter(
  userInstance: string,
  jrd: JRD | null,
): Promise<IntentAdapter> {
  const adapter = findAdapter(jrd);
  if (adapter.name !== 'default') return adapter;

  const software = await fetchNodeinfoSoftwareName(userInstance);
  const swAdapter = findAdapterBySoftware(software);
  if (swAdapter) return swAdapter;

  if (await speaksMastodonApi(userInstance)) return adapter;

  if (!(await isInstanceReachable(userInstance))) {
    throw new InstanceUnreachableError(userInstance);
  }
  throw new UnsupportedInstanceError(userInstance);
}

export async function resolveReplyUrl(
  userInstance: string,
  tootUrl: string,
): Promise<string> {
  const jrd = await fetchWebfingerJRD(userInstance, 'reply');
  const adapter = await pickAdapter(userInstance, jrd);
  return adapter.resolveReplyUrl(userInstance, tootUrl, jrd);
}

export async function resolveShareUrl(
  userInstance: string,
  text: string,
): Promise<string> {
  const jrd = await fetchWebfingerJRD(userInstance, 'share');
  const adapter = await pickAdapter(userInstance, jrd);
  return adapter.resolveShareUrl(userInstance, text, jrd);
}
