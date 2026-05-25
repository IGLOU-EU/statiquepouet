// Live tests against mastodon.social. Validates the webfinger routes
// to DefaultAdapter and /context returns a valid reply tree on a
// public status discovered via /api/v1/trends/statuses. Skips on
// network failure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContextUrl } from '../../src/urls.js';
import { findAdapter } from '../../src/adapters/finder.js';
import type { JRD } from '../../src/types.js';

const INSTANCE = 'mastodon.social';
const KNOWN_ACCT = 'Mastodon'; // @Mastodon@mastodon.social, project's own account
const TIMEOUT_MS = 5000;

interface Status {
  id: string;
  url: string;
  replies_count?: number;
}

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

test(`live ${INSTANCE}: webfinger + adapter selection`, async (t) => {
  const url = `https://${INSTANCE}/.well-known/webfinger?resource=${encodeURIComponent(
    `acct:${KNOWN_ACCT}@${INSTANCE}`,
  )}`;
  let jrd: JRD & { subject?: string };
  try {
    jrd = await fetchJson(url);
  } catch (err) {
    t.skip(`network unavailable: ${(err as Error).message}`);
    return;
  }

  console.log(`\n  webfinger: ${url}`);
  console.log(`  subject  : ${jrd.subject}`);
  console.log(`  links    : ${jrd.links?.length ?? 0}`);

  assert.ok(jrd.links && Array.isArray(jrd.links), 'JRD.links must be an array');

  const adapter = findAdapter(jrd);
  console.log(`  adapter  : ${adapter.name}`);
  assert.equal(adapter.name, 'default', 'Mastodon should be routed to the default adapter');
});

test(`live ${INSTANCE}: /context returns a valid reply tree`, async (t) => {
  let trends: Status[];
  try {
    trends = await fetchJson<Status[]>(`https://${INSTANCE}/api/v1/trends/statuses?limit=10`);
  } catch (err) {
    t.skip(`network unavailable: ${(err as Error).message}`);
    return;
  }
  if (!Array.isArray(trends) || trends.length === 0) {
    t.skip('no trending statuses available to probe');
    return;
  }
  const status = trends.find((s) => (s.replies_count ?? 0) > 0) ?? trends[0]!;
  console.log(`\n  probing status: id=${status.id}`);
  console.log(`                  url=${status.url}`);

  const ctxUrl = buildContextUrl(INSTANCE, status.id);
  const ctx = await fetchJson<{ ancestors?: unknown; descendants?: unknown }>(ctxUrl);
  assert.ok(Array.isArray(ctx.ancestors), '`ancestors` must be an array');
  assert.ok(Array.isArray(ctx.descendants), '`descendants` must be an array');
  console.log(`  ancestors  : ${(ctx.ancestors as unknown[]).length}`);
  console.log(`  descendants: ${(ctx.descendants as unknown[]).length}`);
});
