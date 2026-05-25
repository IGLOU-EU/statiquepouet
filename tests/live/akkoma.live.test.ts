// Live tests against blob.cat (community Akkoma instance, no
// flagship exists). Validates /api/v1/instance returns an Akkoma
// version string and the webfinger routes to DefaultAdapter.
// /context is covered via pleroma.live.test.ts since Akkoma shares
// the same response shape and most Akkoma timelines are auth-gated.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAdapter } from '../../src/adapters/finder.js';
import type { JRD } from '../../src/types.js';

const INSTANCE = 'blob.cat';
const KNOWN_ACCT = 'admin';
const TIMEOUT_MS = 5000;

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

test(`live ${INSTANCE} (Akkoma): instance API + adapter selection`, async (t) => {
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
    instInfo.version && /akkoma/i.test(instInfo.version),
    `expected Akkoma in version string, got: ${instInfo.version}`,
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
  assert.equal(adapter.name, 'default', 'Akkoma should be routed to the default adapter');
});
