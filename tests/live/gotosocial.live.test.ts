// Live tests against gts.superseriousbusiness.org (official GTS
// instance). Validates /api/v1/instance returns a GTS version string
// and the instance-actor webfinger routes to DefaultAdapter (GTS
// has no FEP-3b86 nor OStatus templates, the hand-built
// /authorize_interaction fallback handles it).
// /context untested live since public statuses require auth here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAdapter } from '../../src/adapters/finder.js';
import type { JRD } from '../../src/types.js';

const INSTANCE = 'gts.superseriousbusiness.org';
const TIMEOUT_MS = 5000;

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

test(`live ${INSTANCE} (GoToSocial): instance API + adapter selection`, async (t) => {
  // GoToSocial reports a bare semantic version (e.g. "0.21.2+git-…")
  // without naming itself in the `version` field. Detect via `title`
  // or `description` which both mention "GoToSocial".
  let instInfo: { version?: string; title?: string; description?: string };
  try {
    instInfo = await fetchJson(`https://${INSTANCE}/api/v1/instance`);
  } catch (err) {
    t.skip(`network unavailable: ${(err as Error).message}`);
    return;
  }
  console.log(`\n  /api/v1/instance ok`);
  console.log(`  version : ${instInfo.version}`);
  console.log(`  title   : ${instInfo.title}`);
  const looksLikeGTS =
    /gotosocial|gts/i.test(instInfo.title ?? '') ||
    /gotosocial|gts/i.test(instInfo.description ?? '');
  assert.ok(looksLikeGTS, `expected GoToSocial signature in title/description`);

  // The instance actor is reachable via webfinger at the bare domain.
  const wfUrl = `https://${INSTANCE}/.well-known/webfinger?resource=${encodeURIComponent(
    `acct:dumpsterqueer@superseriousbusiness.org`,
  )}`;
  const jrd = await fetchJson<JRD & { subject?: string }>(wfUrl);
  console.log(`  webfinger subject: ${jrd.subject}`);
  console.log(`  webfinger links  : ${jrd.links?.length ?? 0}`);
  assert.ok(jrd.links && Array.isArray(jrd.links), 'JRD.links must be an array');

  const adapter = findAdapter(jrd);
  console.log(`  adapter : ${adapter.name}`);
  assert.equal(adapter.name, 'default', 'GoToSocial should be routed to the default adapter');
});
