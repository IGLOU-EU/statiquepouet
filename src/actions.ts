import type { ContextResponse, ParsedToot } from './types.js';
import { parseTootUrl, extractAuthorHandle } from './parse.js';
import { buildContextUrl } from './urls.js';
import {
  resolveReplyUrl,
  resolveShareUrl,
  UnsupportedInstanceError,
  InstanceUnreachableError,
} from './intent.js';
import { buildTree } from './threading.js';
import {
  getStoredInstance,
  setStoredInstance,
  clearStoredInstance,
} from './storage.js';
import { ensureInit, getConfig, getLocale, t } from './state.js';
import {
  replaceContent,
  renderError,
  renderLoading,
  renderEmpty,
  renderTree,
} from './render.js';
import { showInstanceModal } from './modal.js';

type MetaResult =
  | { ok: true; meta: ParsedToot }
  | { ok: false; error: string };

function readMeta(): MetaResult {
  const el = document.querySelector('meta[name="fediverse-context"]');
  if (!el) return { ok: false, error: 'errorMissingMeta' };
  const parsed = parseTootUrl(el.getAttribute('content'));
  if (!parsed) return { ok: false, error: 'errorInvalidMeta' };
  return { ok: true, meta: parsed };
}

function getCanonicalUrl(): string {
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  return link?.href || window.location.href;
}

/**
 * Runs the resolver inside the modal validator. UnsupportedInstance
 * and InstanceUnreachable errors surface inline so the user can
 * retype. Anything else bubbles. On success the tab opens after the
 * modal closes, relying on transient activation to bypass the popup
 * blocker (fallback navigates the current tab).
 */
async function runInteraction(
  sourceInstance: string,
  resolver: (instance: string) => Promise<string>,
): Promise<void> {
  let resolvedUrl: string | null = null;
  let instance: string;
  try {
    instance = await showInstanceModal(
      sourceInstance,
      getStoredInstance(),
      async (candidate) => {
        try {
          resolvedUrl = await resolver(candidate);
          return null;
        } catch (err) {
          if (err instanceof InstanceUnreachableError) {
            return t('errorInstanceUnreachable', { instance: candidate });
          }
          if (err instanceof UnsupportedInstanceError) {
            return t('errorInstanceUnsupported', { instance: candidate });
          }
          throw err;
        }
      },
    );
  } catch {
    return;
  }
  setStoredInstance(instance);
  if (!resolvedUrl) return;

  const popup = window.open(resolvedUrl, '_blank');
  if (popup) {
    popup.opener = null;
  } else {
    window.location.href = resolvedUrl;
  }
}

export async function loadComments(): Promise<void> {
  await ensureInit();
  const config = getConfig();
  const container = document.getElementById(config.commentsContainerId);
  if (!container) {
    console.warn(
      '[statique-pouet] commentsContainerId not found:',
      config.commentsContainerId,
    );
    return;
  }

  const r = readMeta();
  if (!r.ok) {
    replaceContent(container, renderError, t(r.error));
    return;
  }
  const { meta } = r;

  replaceContent(container, renderLoading);

  let context: ContextResponse;
  try {
    const res = await fetch(buildContextUrl(meta.instance, meta.statusId));
    if (res.status === 404) {
      replaceContent(container, renderError, t('errorNotFound'));
      return;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    context = (await res.json()) as ContextResponse;
  } catch (err) {
    console.error('[statique-pouet]', err);
    replaceContent(container, renderError, t('errorNetwork'));
    return;
  }

  const descendants = Array.isArray(context.descendants) ? context.descendants : [];
  if (descendants.length === 0) {
    replaceContent(container, renderEmpty);
    return;
  }

  const tree = buildTree(meta.statusId, descendants);
  replaceContent(container, (c) => renderTree(tree, c, getLocale(), postComment));
}

/** Reply to the anchor toot or to a sub-toot via `statusUrl`. */
export async function postComment(statusUrl?: string): Promise<void> {
  await ensureInit();
  let targetUrl = statusUrl;
  if (!targetUrl) {
    const r = readMeta();
    if (!r.ok) {
      alert(t(r.error));
      return;
    }
    targetUrl = r.meta.url;
  }

  const sourceInstance = parseTootUrl(targetUrl)?.instance ?? '';
  await runInteraction(sourceInstance, (instance) =>
    resolveReplyUrl(instance, targetUrl),
  );
}

/**
 * Publishes a standalone toot mentioning the anchor author and
 * linking to the current page. Does not appear in the thread.
 */
export async function shareArticle(): Promise<void> {
  await ensureInit();
  const r = readMeta();
  if (!r.ok) {
    alert(t(r.error));
    return;
  }
  const { meta } = r;

  const articleUrl = getCanonicalUrl();
  const handle = extractAuthorHandle(meta.url);
  const text = handle ? `${handle} ${articleUrl}` : articleUrl;

  await runInteraction(meta.instance, (instance) =>
    resolveShareUrl(instance, text),
  );
}

export function clearInstance(): void {
  clearStoredInstance();
}
