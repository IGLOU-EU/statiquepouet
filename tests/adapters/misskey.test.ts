import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MisskeyAdapter,
  isMisskeyJRD,
  isMisskeySoftware,
} from '../../src/adapters/misskey.js';
import {
  REL_FEP_OBJECT,
  REL_OSTATUS_SUBSCRIBE,
} from '../../src/types.js';

const TOOT = 'https://mastodon.social/@Mastodon/116489457177711947';
const USER_INSTANCE = 'misskey.io';

// resolveReplyUrl

test('MisskeyAdapter.resolveReplyUrl: builds /share?replyUri= with encoded toot URL', () => {
  const out = MisskeyAdapter.resolveReplyUrl(USER_INSTANCE, TOOT, null);
  assert.equal(
    out,
    `https://misskey.io/share?replyUri=${encodeURIComponent(TOOT)}`,
  );
});

test('MisskeyAdapter.resolveReplyUrl: ignores JRD content (URL pattern is fixed)', () => {
  const jrd = {
    links: [
      { rel: REL_FEP_OBJECT, template: 'https://elsewhere.example/x?o={object}' },
    ],
  };
  // Misskey ignores FEP-3b86 templates. The adapter is selected
  // exactly because the rest of the chain wouldn't reach this URL.
  const out = MisskeyAdapter.resolveReplyUrl(USER_INSTANCE, TOOT, jrd);
  assert.ok(out.startsWith('https://misskey.io/share?replyUri='));
});

test('MisskeyAdapter.resolveReplyUrl: encodes the toot URL strictly', () => {
  const out = MisskeyAdapter.resolveReplyUrl(USER_INSTANCE, 'https://example.com/path?a=1&b=2', null);
  assert.ok(out.includes('%3Fa%3D1%26b%3D2'));
});

// resolveShareUrl

test('MisskeyAdapter.resolveShareUrl: builds /share?text= with encoded text', () => {
  const out = MisskeyAdapter.resolveShareUrl(USER_INSTANCE, 'hello world', null);
  assert.equal(out, 'https://misskey.io/share?text=hello%20world');
});

test('MisskeyAdapter.resolveShareUrl: encodes @-mentions and URLs in the text', () => {
  const text = '@author@instance.tld https://blog.example/article-x';
  const out = MisskeyAdapter.resolveShareUrl(USER_INSTANCE, text, null);
  assert.ok(out.includes('%40author%40instance.tld'));
  assert.ok(out.includes('https%3A%2F%2Fblog.example%2Farticle-x'));
});

// isMisskeyJRD

test('isMisskeyJRD: Misskey-style /authorize-follow → true', () => {
  const jrd = {
    links: [
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://misskey.io/authorize-follow?acct={uri}' },
    ],
  };
  assert.equal(isMisskeyJRD(jrd), true);
});

test('isMisskeyJRD: Mastodon /authorize_interaction → false', () => {
  const jrd = {
    links: [
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://mastodon.social/authorize_interaction?uri={uri}' },
    ],
  };
  assert.equal(isMisskeyJRD(jrd), false);
});

test('isMisskeyJRD: Pleroma /ostatus_subscribe → false', () => {
  const jrd = {
    links: [
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://pleroma.example/ostatus_subscribe?acct={uri}' },
    ],
  };
  assert.equal(isMisskeyJRD(jrd), false);
});

test('isMisskeyJRD: no OStatus subscribe template at all → false', () => {
  const jrd = {
    links: [
      { rel: 'self', href: 'https://x.example/actor' },
    ],
  };
  assert.equal(isMisskeyJRD(jrd), false);
});

test('isMisskeyJRD: malformed template URL → false (does not throw)', () => {
  const jrd = {
    links: [{ rel: REL_OSTATUS_SUBSCRIBE, template: 'not a url' }],
  };
  assert.equal(isMisskeyJRD(jrd), false);
});

test('isMisskeyJRD: case-insensitive matching of the path', () => {
  const jrd = {
    links: [
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://misskey.io/Authorize-Follow?acct={uri}' },
    ],
  };
  assert.equal(isMisskeyJRD(jrd), true);
});

// isMisskeySoftware (nodeinfo)

test('isMisskeySoftware: known family members match', () => {
  for (const name of ['misskey', 'sharkey', 'firefish', 'iceshrimp', 'foundkey', 'calckey']) {
    assert.equal(isMisskeySoftware(name), true, `expected ${name} → true`);
  }
});

test('isMisskeySoftware: case-insensitive', () => {
  assert.equal(isMisskeySoftware('Misskey'), true);
  assert.equal(isMisskeySoftware('SHARKEY'), true);
  assert.equal(isMisskeySoftware('FireFish'), true);
});

test('isMisskeySoftware: Mastodon-family and others return false', () => {
  for (const name of ['mastodon', 'pleroma', 'akkoma', 'gotosocial', 'pixelfed', 'lemmy', 'peertube', '']) {
    assert.equal(isMisskeySoftware(name), false, `expected ${name} → false`);
  }
});
