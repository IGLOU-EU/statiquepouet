// Live tests against misskey.io. Misskey has no /api/v1/statuses/:id/context
// (it uses /api/notes/conversation on its own API surface), so we cover
// only the WRITE side: /share?replyUri=… via MisskeyAdapter.
//   1. JRD obtained from an account webfinger routes to MisskeyAdapter.
//   2. resolveReplyUrl(misskey.io, …) returns a /share?replyUri= URL.
//      Exercises the nodeinfo secondary signal, since the instance-actor
//      webfinger 404s on Misskey.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAdapter } from '../../src/adapters/finder.js';
import { findTemplateLink } from '../../src/jrd.js';
import { REL_OSTATUS_SUBSCRIBE } from '../../src/types.js';
import { resolveReplyUrl, UnsupportedInstanceError } from '../../src/intent.js';
import type { JRD } from '../../src/types.js';

const INSTANCE = 'misskey.io';
const KNOWN_ACCT = 'syuilo'; // Misskey project's creator
const TOOT = 'https://mastodon.social/@Mastodon/116489457177711947';
const TIMEOUT_MS = 5000;

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

test(`live ${INSTANCE} (Misskey): account-webfinger JRD → MisskeyAdapter`, async (t) => {
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

  const subscribeTemplate = findTemplateLink(jrd, REL_OSTATUS_SUBSCRIBE);
  console.log(`  subscribe template: ${subscribeTemplate}`);
  assert.ok(
    subscribeTemplate && /authorize-follow/i.test(subscribeTemplate),
    `Misskey signature missing: subscribe template should point at /authorize-follow, got: ${subscribeTemplate}`,
  );

  const adapter = findAdapter(jrd);
  console.log(`  adapter  : ${adapter.name}`);
  assert.equal(adapter.name, 'misskey', 'Misskey-family JRD must route to MisskeyAdapter');
});

test(`live ${INSTANCE} (Misskey): resolveReplyUrl produces a /share?replyUri= URL`, async (t) => {
  // Skip the whole test if misskey.io is unreachable from the runner.
  try {
    await fetch(`https://${INSTANCE}/.well-known/nodeinfo`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    t.skip(`network unavailable: ${(err as Error).message}`);
    return;
  }

  let url: string;
  try {
    url = await resolveReplyUrl(INSTANCE, TOOT);
  } catch (err) {
    if (err instanceof UnsupportedInstanceError) {
      assert.fail(
        `resolveReplyUrl threw UnsupportedInstanceError on ${INSTANCE} — ` +
          `the nodeinfo fallback failed to identify it as a Misskey-family server.`,
      );
    }
    throw err;
  }

  console.log(`\n  resolveReplyUrl(${INSTANCE}, …) → ${url}`);
  assert.ok(
    url.startsWith(`https://${INSTANCE}/share?replyUri=`),
    `expected /share?replyUri= URL on Misskey, got: ${url}`,
  );
  assert.ok(
    url.includes(encodeURIComponent(TOOT)),
    `target toot URL must be URL-encoded in the query string`,
  );
});
