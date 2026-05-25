// Live tests against pixelfed.social. Validates /api/v1/instance
// returns a Pixelfed version and the webfinger routes to
// DefaultAdapter. /context untested live since Pixelfed redirects
// unauthenticated public-endpoint clients to a login page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAdapter } from '../../src/adapters/finder.js';
import type { JRD } from '../../src/types.js';

const INSTANCE = 'pixelfed.social';
const KNOWN_ACCT = 'dansup'; // Pixelfed project creator
const TIMEOUT_MS = 5000;

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

test(`live ${INSTANCE} (Pixelfed): instance API + adapter selection`, async (t) => {
  let instInfo: { version?: string };
  try {
    instInfo = await fetchJson(`https://${INSTANCE}/api/v1/instance`);
  } catch (err) {
    t.skip(`network unavailable: ${(err as Error).message}`);
    return;
  }
  console.log(`\n  /api/v1/instance ok`);
  console.log(`  version : ${instInfo.version}`);
  assert.ok(
    instInfo.version && /pixelfed/i.test(instInfo.version),
    `expected Pixelfed in version string, got: ${instInfo.version}`,
  );

  const wfUrl = `https://${INSTANCE}/.well-known/webfinger?resource=${encodeURIComponent(
    `acct:${KNOWN_ACCT}@${INSTANCE}`,
  )}`;
  const jrd = await fetchJson<JRD & { subject?: string }>(wfUrl);
  console.log(`  webfinger subject: ${jrd.subject}`);
  console.log(`  webfinger links  : ${jrd.links?.length ?? 0}`);
  assert.ok(jrd.links && Array.isArray(jrd.links), 'JRD.links must be an array');

  const adapter = findAdapter(jrd);
  console.log(`  adapter : ${adapter.name}`);
  assert.equal(adapter.name, 'default', 'Pixelfed should be routed to the default adapter');
});
