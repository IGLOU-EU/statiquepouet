import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTootUrl, extractAuthorHandle } from '../src/parse.js';

test('parseTootUrl: canonical Mastodon URL', () => {
  assert.deepEqual(
    parseTootUrl('https://mastodon.social/@Mastodon/116489457177711947'),
    {
      instance: 'mastodon.social',
      statusId: '116489457177711947',
      url: 'https://mastodon.social/@Mastodon/116489457177711947',
    }
  );
});

test('parseTootUrl: trailing slash is tolerated', () => {
  const r = parseTootUrl('https://mastodon.social/@Mastodon/116489457177711947/');
  assert.equal(r?.statusId, '116489457177711947');
  assert.equal(r?.url, 'https://mastodon.social/@Mastodon/116489457177711947');
});

test('parseTootUrl: ActivityPub URI (users/.../statuses/...)', () => {
  assert.deepEqual(
    parseTootUrl('https://mastodon.social/users/Mastodon/statuses/116489457177711947'),
    {
      instance: 'mastodon.social',
      statusId: '116489457177711947',
      url: 'https://mastodon.social/users/Mastodon/statuses/116489457177711947',
    }
  );
});

test('parseTootUrl: federated view with @user@instance', () => {
  const r = parseTootUrl('https://example.social/@Mastodon@mastodon.social/987654321');
  assert.equal(r?.instance, 'example.social');
  assert.equal(r?.statusId, '987654321');
});

test('parseTootUrl: leading/trailing whitespace tolerated', () => {
  const r = parseTootUrl('  https://mastodon.social/@Mastodon/116489457177711947  ');
  assert.equal(r?.instance, 'mastodon.social');
  assert.equal(r?.statusId, '116489457177711947');
});

test('parseTootUrl: query string and fragment ignored', () => {
  const r = parseTootUrl('https://mastodon.social/@Mastodon/116489457177711947?utm=foo#anchor');
  assert.equal(r?.instance, 'mastodon.social');
  assert.equal(r?.statusId, '116489457177711947');
  assert.equal(r?.url, 'https://mastodon.social/@Mastodon/116489457177711947');
});

test('parseTootUrl: http accepted (local dev instance)', () => {
  const r = parseTootUrl('http://localhost:3000/@admin/42');
  assert.equal(r?.instance, 'localhost:3000');
  assert.equal(r?.statusId, '42');
});

test('parseTootUrl: non-HTTP protocol rejected', () => {
  assert.equal(parseTootUrl('ftp://example.com/@admin/123'), null);
  assert.equal(parseTootUrl('javascript:alert(1)'), null);
});

test('parseTootUrl: Pleroma/Akkoma notice URL (alphanumeric FlakeID)', () => {
  const r = parseTootUrl('https://akkoma.example/notice/B6Yx2UmiArD4aBaHPU');
  assert.equal(r?.instance, 'akkoma.example');
  assert.equal(r?.statusId, 'B6Yx2UmiArD4aBaHPU');
  assert.equal(r?.url, 'https://akkoma.example/notice/B6Yx2UmiArD4aBaHPU');
});

test('parseTootUrl: GoToSocial (ULID)', () => {
  const r = parseTootUrl('https://gts.example/@admin/statuses/01H8E2X5R6QXK4VFJG3SD8YQNC');
  assert.equal(r?.instance, 'gts.example');
  assert.equal(r?.statusId, '01H8E2X5R6QXK4VFJG3SD8YQNC');
});

test('parseTootUrl: UUID with dashes', () => {
  const r = parseTootUrl('https://example.com/posts/550e8400-e29b-41d4-a716-446655440000');
  assert.equal(r?.statusId, '550e8400-e29b-41d4-a716-446655440000');
});

test('parseTootUrl: fewer than 2 path segments → null', () => {
  assert.equal(parseTootUrl('https://mastodon.social/@Mastodon'), null);
  assert.equal(parseTootUrl('https://mastodon.social/'), null);
});

test('parseTootUrl: disallowed characters in last segment → null', () => {
  assert.equal(parseTootUrl('https://mastodon.social/@Mastodon/foo.bar'), null);
  assert.equal(parseTootUrl('https://mastodon.social/@Mastodon/foo bar'), null);
});

test('parseTootUrl: invalid input → null', () => {
  assert.equal(parseTootUrl(''), null);
  assert.equal(parseTootUrl(null), null);
  assert.equal(parseTootUrl(undefined), null);
  assert.equal(parseTootUrl(42), null);
  assert.equal(parseTootUrl('not a url'), null);
});

// extractAuthorHandle

test('extractAuthorHandle: canonical Mastodon URL /@user/:id', () => {
  assert.equal(
    extractAuthorHandle('https://mastodon.social/@Mastodon/116489457177711947'),
    '@Mastodon@mastodon.social',
  );
});

test('extractAuthorHandle: federated URL /@user@other-instance/:id', () => {
  assert.equal(
    extractAuthorHandle('https://example.social/@Mastodon@mastodon.social/987654321'),
    '@Mastodon@mastodon.social',
  );
});

test('extractAuthorHandle: ActivityPub URI /users/user/statuses/:id', () => {
  assert.equal(
    extractAuthorHandle('https://mastodon.social/users/Mastodon/statuses/116489457177711947'),
    '@Mastodon@mastodon.social',
  );
});

test('extractAuthorHandle: Pleroma /notice/:id URL → null (author not derivable)', () => {
  assert.equal(
    extractAuthorHandle('https://akkoma.example/notice/B6Yx2UmiArD4aBaHPU'),
    null,
  );
});

test('extractAuthorHandle: invalid input → null', () => {
  assert.equal(extractAuthorHandle('not a url'), null);
  assert.equal(extractAuthorHandle(''), null);
  assert.equal(extractAuthorHandle(null), null);
  assert.equal(extractAuthorHandle(undefined), null);
  assert.equal(extractAuthorHandle(42), null);
});

test('extractAuthorHandle: empty @ → null', () => {
  assert.equal(extractAuthorHandle('https://example.social/@/123'), null);
});

test('extractAuthorHandle: trailing slash tolerated', () => {
  assert.equal(
    extractAuthorHandle('https://mastodon.social/@Mastodon/116489457177711947/'),
    '@Mastodon@mastodon.social',
  );
});
