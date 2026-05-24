import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContextUrl,
  buildAuthorizeUrl,
  buildPeersSearchUrl,
  buildWebfingerUrl,
  buildShareUrl,
} from '../src/urls.js';
import { normalizeInstance, isValidInstance } from '../src/parse.js';

test('buildContextUrl: API endpoint', () => {
  assert.equal(
    buildContextUrl('mastodon.social', '116489457177711947'),
    'https://mastodon.social/api/v1/statuses/116489457177711947/context'
  );
});

test('buildAuthorizeUrl: redirect to user instance', () => {
  assert.equal(
    buildAuthorizeUrl('example.social', 'https://mastodon.social/@Mastodon/116489457177711947'),
    'https://example.social/authorize_interaction?uri=https%3A%2F%2Fmastodon.social%2F%40Mastodon%2F116489457177711947'
  );
});

test('buildAuthorizeUrl: URL with special characters is encoded', () => {
  const url = buildAuthorizeUrl('mastodon.social', 'https://example.com/path with space?a=1&b=2');
  assert.ok(url.includes('path%20with%20space'));
  assert.ok(url.includes('%3Fa%3D1%26b%3D2'));
});

test('buildPeersSearchUrl: q parameter is encoded', () => {
  assert.equal(
    buildPeersSearchUrl('mastodon.social', 'mast'),
    'https://mastodon.social/api/v1/peers/search?q=mast'
  );
  assert.equal(
    buildPeersSearchUrl('example.social', 'a b'),
    'https://example.social/api/v1/peers/search?q=a%20b'
  );
});

test('buildWebfingerUrl: resource parameter is encoded', () => {
  assert.equal(
    buildWebfingerUrl('mastodon.social'),
    'https://mastodon.social/.well-known/webfinger?resource=https%3A%2F%2Fmastodon.social'
  );
});

test('buildShareUrl: /share endpoint with encoded text', () => {
  assert.equal(
    buildShareUrl('mastodon.social', 'hello world'),
    'https://mastodon.social/share?text=hello%20world',
  );
});

test('buildShareUrl: @user@instance mention + URL encoded', () => {
  assert.equal(
    buildShareUrl('mastodon.social', '@Mastodon@mastodon.social https://blog.example/article-x'),
    'https://mastodon.social/share?text=%40Mastodon%40mastodon.social%20https%3A%2F%2Fblog.example%2Farticle-x',
  );
});

test('normalizeInstance: strips protocol, trailing slash, lowercases', () => {
  assert.equal(normalizeInstance('HTTPS://Mastodon.Social/'), 'mastodon.social');
  assert.equal(normalizeInstance('  mastodon.social  '), 'mastodon.social');
  assert.equal(normalizeInstance('http://example.social/path'), 'example.social');
});

test('isValidInstance: accepted domains', () => {
  assert.ok(isValidInstance('mastodon.social'));
  assert.ok(isValidInstance('example.social'));
  assert.ok(isValidInstance('social.example.co.uk'));
  assert.ok(isValidInstance('https://Mastodon.Social/'));
  assert.equal(isValidInstance('localhost:3000'), false); // no TLD
  assert.ok(isValidInstance('mastodon.social:8443'));
});

test('isValidInstance: rejected domains', () => {
  assert.equal(isValidInstance(''), false);
  assert.equal(isValidInstance('not a domain'), false);
  assert.equal(isValidInstance('justaword'), false);
  assert.equal(isValidInstance(null), false);
  assert.equal(isValidInstance(undefined), false);
});
