import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLang, format } from '../src/lang.js';

test('resolveLang: explicit config wins over everything else', () => {
  assert.equal(resolveLang('fr', 'en', 'de'), 'fr');
});

test('resolveLang: falls back to <html lang> when no config', () => {
  assert.equal(resolveLang(null, 'de', 'en'), 'de');
  assert.equal(resolveLang(undefined, 'de', 'en'), 'de');
  assert.equal(resolveLang('', 'de', 'en'), 'de');
});

test('resolveLang: falls back to navigator.language when no <html lang>', () => {
  assert.equal(resolveLang(null, null, 'es'), 'es');
  assert.equal(resolveLang(null, '', 'es'), 'es');
});

test('resolveLang: defaults to "en" when nothing is set', () => {
  assert.equal(resolveLang(null, null, null), 'en');
  assert.equal(resolveLang(undefined, undefined, undefined), 'en');
  assert.equal(resolveLang('', '', ''), 'en');
});

test('resolveLang: regional code is reduced to its base (fr-FR → fr)', () => {
  assert.equal(resolveLang('fr-FR', null, null), 'fr');
  assert.equal(resolveLang(null, 'pt-BR', null), 'pt');
  assert.equal(resolveLang(null, null, 'en-US'), 'en');
});

test('resolveLang: underscore separator is also accepted (zh_CN)', () => {
  assert.equal(resolveLang(null, 'zh_CN', null), 'zh');
});

test('resolveLang: result is lowercased', () => {
  assert.equal(resolveLang('FR', null, null), 'fr');
  assert.equal(resolveLang(null, 'DE-AT', null), 'de');
});

test('format: simple substitution', () => {
  assert.equal(format('Hello {name}', { name: 'world' }), 'Hello world');
});

test('format: missing variable replaced with empty string', () => {
  assert.equal(format('A{x}B', {}), 'AB');
});

test('format: returns template as-is when no vars are passed', () => {
  assert.equal(format('Hello {x}'), 'Hello {x}');
});

test('format: numeric values are stringified', () => {
  assert.equal(format('count={n}', { n: 42 }), 'count=42');
});
