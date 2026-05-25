import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAdapter, findAdapterBySoftware } from '../../src/adapters/finder.js';
import { REL_OSTATUS_SUBSCRIBE, REL_FEP_OBJECT } from '../../src/types.js';

test('findAdapter: null JRD → DefaultAdapter', () => {
  assert.equal(findAdapter(null).name, 'default');
});

test('findAdapter: Mastodon JRD → DefaultAdapter', () => {
  const jrd = {
    links: [
      { rel: REL_FEP_OBJECT, template: 'https://mastodon.social/authorize_interaction?uri={object}' },
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://mastodon.social/authorize_interaction?uri={uri}' },
    ],
  };
  assert.equal(findAdapter(jrd).name, 'default');
});

test('findAdapter: Pleroma/Akkoma JRD → DefaultAdapter', () => {
  const jrd = {
    links: [
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://pleroma.example/ostatus_subscribe?acct={uri}' },
    ],
  };
  assert.equal(findAdapter(jrd).name, 'default');
});

test('findAdapter: Misskey JRD → MisskeyAdapter', () => {
  const jrd = {
    links: [
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://misskey.io/authorize-follow?acct={uri}' },
    ],
  };
  assert.equal(findAdapter(jrd).name, 'misskey');
});

test('findAdapter: GoToSocial JRD (no subscribe template) → DefaultAdapter', () => {
  const jrd = {
    links: [
      { rel: 'self', href: 'https://gts.example/users/x' },
    ],
  };
  assert.equal(findAdapter(jrd).name, 'default');
});

test('findAdapter: empty JRD → DefaultAdapter', () => {
  assert.equal(findAdapter({}).name, 'default');
});

test('findAdapter: JRD with invalid links → DefaultAdapter', () => {
  assert.equal(findAdapter({ links: 'not an array' as unknown as [] }).name, 'default');
});

test('findAdapter: Misskey detection wins over a stray Object rel', () => {
  // Misskey doesn't typically publish FEP-3b86 Object, but if a future
  // fork did while keeping the follow-only subscribe template, the
  // exception detection should still win (it's specifically about the
  // follow-only flavor).
  const jrd = {
    links: [
      { rel: REL_FEP_OBJECT, template: 'https://misskey.io/somewhere?o={object}' },
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://misskey.io/authorize-follow?acct={uri}' },
    ],
  };
  assert.equal(findAdapter(jrd).name, 'misskey');
});

// findAdapterBySoftware (nodeinfo)

test('findAdapterBySoftware: misskey → MisskeyAdapter', () => {
  assert.equal(findAdapterBySoftware('misskey')?.name, 'misskey');
});

test('findAdapterBySoftware: every Misskey-family name → MisskeyAdapter', () => {
  for (const name of ['misskey', 'sharkey', 'firefish', 'iceshrimp', 'foundkey', 'calckey']) {
    assert.equal(findAdapterBySoftware(name)?.name, 'misskey', `expected ${name} → misskey`);
  }
});

test('findAdapterBySoftware: case-insensitive', () => {
  assert.equal(findAdapterBySoftware('Misskey')?.name, 'misskey');
});

test('findAdapterBySoftware: Mastodon-family returns null (caller must probe Mastodon API)', () => {
  for (const name of ['mastodon', 'pleroma', 'akkoma', 'gotosocial', 'pixelfed']) {
    assert.equal(findAdapterBySoftware(name), null, `expected ${name} → null`);
  }
});

test('findAdapterBySoftware: null/empty → null', () => {
  assert.equal(findAdapterBySoftware(null), null);
  assert.equal(findAdapterBySoftware(''), null);
});

test('findAdapterBySoftware: non-microblog fediverse software → null', () => {
  // Fediverse but not microblogging. The caller falls through to
  // the Mastodon API probe and then to UnsupportedInstanceError.
  for (const name of ['lemmy', 'peertube', 'mobilizon', 'writefreely', 'bookwyrm']) {
    assert.equal(findAdapterBySoftware(name), null, `expected ${name} → null`);
  }
});
