// Live tests against udongein.xyz (public Pleroma 2.6.x with open
// local timeline). Pleroma has no flagship instance. Validates the
// webfinger routes to DefaultAdapter (the /ostatus_subscribe template
// accepts a URI) and /context returns a valid reply tree.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContextUrl } from '../../src/urls.js';
import { findAdapter } from '../../src/adapters/finder.js';
import type { JRD } from '../../src/types.js';

const INSTANCE = 'udongein.xyz';
const KNOWN_ACCT = 'yura'; // Public local account on udongein.xyz
const TIMEOUT_MS = 5000;

interface Status { id: string; url: string; account?: { acct?: string }; }

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

test(`live ${INSTANCE} (Pleroma): webfinger + adapter selection`, async (t) => {
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
  assert.equal(adapter.name, 'default', 'Pleroma should be routed to the default adapter');
});

test(`live ${INSTANCE} (Pleroma): /context returns a valid reply tree`, async (t) => {
  let statuses: Status[];
  try {
    statuses = await fetchJson<Status[]>(
      `https://${INSTANCE}/api/v1/timelines/public?limit=5&local=true`,
    );
  } catch (err) {
    t.skip(`network unavailable: ${(err as Error).message}`);
    return;
  }
  if (!Array.isArray(statuses) || statuses.length === 0) {
    t.skip('no local public statuses available to probe');
    return;
  }
  const status = statuses[0]!;
  console.log(`\n  probing status: id=${status.id}`);
  console.log(`                  url=${status.url}`);

  const ctxUrl = buildContextUrl(INSTANCE, status.id);
  const ctx = await fetchJson<{ ancestors?: unknown; descendants?: unknown }>(ctxUrl);
  assert.ok(Array.isArray(ctx.ancestors), '`ancestors` must be an array');
  assert.ok(Array.isArray(ctx.descendants), '`descendants` must be an array');
  console.log(`  ancestors  : ${(ctx.ancestors as unknown[]).length}`);
  console.log(`  descendants: ${(ctx.descendants as unknown[]).length}`);
});
