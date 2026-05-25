import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefaultAdapter, isFollowOnlyTemplate } from '../../src/adapters/default.js';
import {
  REL_FEP_OBJECT,
  REL_FEP_CREATE,
  REL_OSTATUS_SUBSCRIBE,
} from '../../src/types.js';

const TOOT = 'https://mastodon.social/@Mastodon/116489457177711947';
const USER_INSTANCE = 'mastodon.social';

// resolveReplyUrl

test('DefaultAdapter.resolveReplyUrl: FEP-3b86 Object template wins (modern Mastodon)', () => {
  const jrd = {
    links: [
      { rel: REL_FEP_OBJECT, template: 'https://mastodon.social/authorize_interaction?uri={object}' },
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://mastodon.social/authorize_interaction?uri={uri}' },
    ],
  };
  const out = DefaultAdapter.resolveReplyUrl(USER_INSTANCE, TOOT, jrd);
  assert.ok(out.startsWith('https://mastodon.social/authorize_interaction?uri='));
  assert.ok(out.includes(encodeURIComponent(TOOT)));
});

test('DefaultAdapter.resolveReplyUrl: falls back to OStatus subscribe (Pleroma/Akkoma)', () => {
  const jrd = {
    links: [
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://pleroma.example/ostatus_subscribe?acct={uri}' },
    ],
  };
  const out = DefaultAdapter.resolveReplyUrl(USER_INSTANCE, TOOT, jrd);
  assert.ok(out.startsWith('https://pleroma.example/ostatus_subscribe?acct='));
  assert.ok(out.includes(encodeURIComponent(TOOT)));
});

test('DefaultAdapter.resolveReplyUrl: skips OStatus subscribe pointing to a follow-only endpoint', () => {
  // Defence in depth. The finder normally routes Misskey JRDs away.
  const jrd = {
    links: [
      { rel: REL_OSTATUS_SUBSCRIBE, template: 'https://misskey.io/authorize-follow?acct={uri}' },
    ],
  };
  const out = DefaultAdapter.resolveReplyUrl(USER_INSTANCE, TOOT, jrd);
  assert.ok(!out.includes('authorize-follow'));
  assert.ok(out.startsWith('https://mastodon.social/authorize_interaction?uri='));
});

test('DefaultAdapter.resolveReplyUrl: hand-built /authorize_interaction when JRD is null', () => {
  const out = DefaultAdapter.resolveReplyUrl(USER_INSTANCE, TOOT, null);
  assert.equal(
    out,
    `https://mastodon.social/authorize_interaction?uri=${encodeURIComponent(TOOT)}`,
  );
});

test('DefaultAdapter.resolveReplyUrl: hand-built fallback when JRD has no relevant rel', () => {
  const jrd = {
    links: [
      { rel: 'self', href: 'https://mastodon.social/actor' },
      { rel: 'http://webfinger.net/rel/profile-page', href: 'https://mastodon.social/@x' },
    ],
  };
  const out = DefaultAdapter.resolveReplyUrl(USER_INSTANCE, TOOT, jrd);
  assert.equal(
    out,
    `https://mastodon.social/authorize_interaction?uri=${encodeURIComponent(TOOT)}`,
  );
});

// resolveShareUrl

test('DefaultAdapter.resolveShareUrl: FEP-3b86 Create template wins', () => {
  const jrd = {
    links: [
      { rel: REL_FEP_CREATE, template: 'https://mastodon.social/share?text={content}' },
    ],
  };
  const out = DefaultAdapter.resolveShareUrl(USER_INSTANCE, 'hello world', jrd);
  assert.equal(out, 'https://mastodon.social/share?text=hello%20world');
});

test('DefaultAdapter.resolveShareUrl: hand-built /share?text= when no Create template', () => {
  const out = DefaultAdapter.resolveShareUrl(USER_INSTANCE, 'hi', null);
  assert.equal(out, 'https://mastodon.social/share?text=hi');
});

test('DefaultAdapter.resolveShareUrl: hand-built fallback when JRD has no Create rel', () => {
  const jrd = {
    links: [{ rel: REL_OSTATUS_SUBSCRIBE, template: 'https://x/sub?acct={uri}' }],
  };
  const out = DefaultAdapter.resolveShareUrl(USER_INSTANCE, 'hi', jrd);
  assert.equal(out, 'https://mastodon.social/share?text=hi');
});

// isFollowOnlyTemplate

test('isFollowOnlyTemplate: Misskey-style authorize-follow → true', () => {
  assert.equal(
    isFollowOnlyTemplate('https://misskey.io/authorize-follow?acct={uri}'),
    true,
  );
});

test('isFollowOnlyTemplate: Mastodon authorize_interaction → false', () => {
  assert.equal(
    isFollowOnlyTemplate('https://mastodon.social/authorize_interaction?uri={uri}'),
    false,
  );
});

test('isFollowOnlyTemplate: Pleroma ostatus_subscribe → false', () => {
  assert.equal(
    isFollowOnlyTemplate('https://pleroma.example/ostatus_subscribe?acct={uri}'),
    false,
  );
});

test('isFollowOnlyTemplate: malformed URL → false (does not throw)', () => {
  assert.equal(isFollowOnlyTemplate('not a url'), false);
});
