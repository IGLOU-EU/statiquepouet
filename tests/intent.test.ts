import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTemplateLink, buildIntentUrl } from '../src/intent.js';
import { REL_FEP_OBJECT, REL_OSTATUS_SUBSCRIBE } from '../src/types.js';

test('findTemplateLink: returns the template for the requested rel', () => {
  const jrd = {
    links: [
      { rel: 'self', href: 'https://example.com/actor' },
      { rel: REL_FEP_OBJECT, template: 'https://example.com/interact?o={object}' },
    ],
  };
  assert.equal(
    findTemplateLink(jrd, REL_FEP_OBJECT),
    'https://example.com/interact?o={object}'
  );
});

test('findTemplateLink: null if rel not found', () => {
  const jrd = { links: [{ rel: REL_OSTATUS_SUBSCRIBE, template: 'x' }] };
  assert.equal(findTemplateLink(jrd, REL_FEP_OBJECT), null);
});

test('findTemplateLink: null if link has no template (only href)', () => {
  const jrd = { links: [{ rel: REL_FEP_OBJECT, href: 'https://example.com/' }] };
  assert.equal(findTemplateLink(jrd, REL_FEP_OBJECT), null);
});

test('findTemplateLink: null on invalid JRD', () => {
  assert.equal(findTemplateLink(null, REL_FEP_OBJECT), null);
  assert.equal(findTemplateLink({}, REL_FEP_OBJECT), null);
  assert.equal(findTemplateLink({ links: 'not-array' as unknown as object }, REL_FEP_OBJECT), null);
});

test('findTemplateLink: ignores null/malformed link entries', () => {
  const jrd = {
    links: [null, undefined, { rel: REL_FEP_OBJECT, template: 'ok' }],
  } as unknown as { links: unknown[] };
  assert.equal(findTemplateLink(jrd, REL_FEP_OBJECT), 'ok');
});

test('findTemplateLink: takes the FIRST match', () => {
  const jrd = {
    links: [
      { rel: REL_FEP_OBJECT, template: 'first' },
      { rel: REL_FEP_OBJECT, template: 'second' },
    ],
  };
  assert.equal(findTemplateLink(jrd, REL_FEP_OBJECT), 'first');
});

test('buildIntentUrl: {object} substitution', () => {
  assert.equal(
    buildIntentUrl(
      'https://akkoma.example/interact?o={object}',
      'object',
      'https://mastodon.social/@Mastodon/116489457177711947'
    ),
    'https://akkoma.example/interact?o=https%3A%2F%2Fmastodon.social%2F%40Mastodon%2F116489457177711947'
  );
});

test('buildIntentUrl: {uri} substitution (legacy OStatus)', () => {
  assert.equal(
    buildIntentUrl(
      'https://example.com/authorize_interaction?uri={uri}',
      'uri',
      'https://example.com/@admin/1'
    ),
    'https://example.com/authorize_interaction?uri=https%3A%2F%2Fexample.com%2F%40admin%2F1'
  );
});

test('buildIntentUrl: URL with special characters is encoded', () => {
  const url = buildIntentUrl('https://x/{object}', 'object', 'https://e/?a=1&b=2');
  assert.ok(url && url.includes('%3Fa%3D1%26b%3D2'));
});

test('buildIntentUrl: invalid inputs → null', () => {
  assert.equal(buildIntentUrl('', 'object', 'x'), null);
  assert.equal(buildIntentUrl('https://x/{object}', '', 'x'), null);
  assert.equal(buildIntentUrl(null, 'object', 'x'), null);
  assert.equal(buildIntentUrl('https://x/{object}', null, 'x'), null);
});
