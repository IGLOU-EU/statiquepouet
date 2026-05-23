import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from '../src/sanitize.js';

test('sanitizeHtml: plain text is unchanged', () => {
  assert.equal(sanitizeHtml('Just plain text.'), 'Just plain text.');
});

test('sanitizeHtml: <p> and <br> are preserved', () => {
  assert.equal(
    sanitizeHtml('<p>Line one<br>Line two</p>'),
    '<p>Line one<br>Line two</p>'
  );
});

test('sanitizeHtml: <a> gets rel and target appended', () => {
  const out = sanitizeHtml('<a href="https://example.com">link</a>');
  assert.ok(out.includes('href="https://example.com"'));
  assert.ok(out.includes('rel="noopener nofollow ugc"'));
  assert.ok(out.includes('target="_blank"'));
  assert.ok(out.includes('>link</a>'));
});

test('sanitizeHtml: javascript: href is stripped', () => {
  const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
  assert.ok(!out.includes('javascript'));
  assert.ok(out.startsWith('<a '));
  assert.ok(out.includes('>x</a>'));
});

test('sanitizeHtml: data: href is stripped', () => {
  const out = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>');
  assert.ok(!out.includes('data:'));
});

test('sanitizeHtml: <script> is removed', () => {
  const out = sanitizeHtml('hello<script>alert(1)</script>world');
  assert.ok(!out.includes('<script'));
  assert.ok(!out.includes('</script'));
  assert.ok(out.includes('hello'));
  assert.ok(out.includes('world'));
});

test('sanitizeHtml: <img> is removed', () => {
  const out = sanitizeHtml('<p>before<img src=x onerror="alert(1)">after</p>');
  assert.ok(!out.includes('<img'));
  assert.ok(!out.includes('onerror'));
  assert.ok(out.includes('before'));
  assert.ok(out.includes('after'));
});

test('sanitizeHtml: <iframe> is removed', () => {
  const out = sanitizeHtml('<iframe src="https://evil.example"></iframe>');
  assert.ok(!out.includes('<iframe'));
});

test('sanitizeHtml: inline event handlers (onclick) are removed', () => {
  const out = sanitizeHtml('<p onclick="alert(1)">text</p>');
  assert.equal(out, '<p>text</p>');
});

test('sanitizeHtml: Mastodon mention (h-card) is preserved', () => {
  const input =
    '<p>Hello <span class="h-card" translate="no"><a href="https://example.com/@admin" class="u-url mention">@<span>admin</span></a></span></p>';
  const out = sanitizeHtml(input);
  assert.ok(out.includes('<p>Hello '));
  assert.ok(out.includes('class="h-card"'));
  assert.ok(!out.includes('translate'));
  assert.ok(out.includes('href="https://example.com/@admin"'));
  assert.ok(out.includes('class="u-url mention"'));
  assert.ok(out.includes('@<span>admin</span></a>'));
});

test('sanitizeHtml: Mastodon hashtag is preserved', () => {
  const input =
    '<p><a href="https://example.com/tags/dev" class="mention hashtag" rel="tag">#<span>dev</span></a></p>';
  const out = sanitizeHtml(input);
  assert.ok(out.includes('href="https://example.com/tags/dev"'));
  assert.ok(out.includes('class="mention hashtag"'));
  assert.ok(out.includes('#<span>dev</span></a>'));
});

test('sanitizeHtml: non-string input → empty', () => {
  assert.equal(sanitizeHtml(null), '');
  assert.equal(sanitizeHtml(undefined), '');
  assert.equal(sanitizeHtml(42), '');
});

test('sanitizeHtml: <em> and <strong>', () => {
  assert.equal(
    sanitizeHtml('<em>i</em> and <strong>b</strong>'),
    '<em>i</em> and <strong>b</strong>'
  );
});

test('sanitizeHtml: unclosed tags are truncated cleanly', () => {
  const out = sanitizeHtml('<p>safe<scriptbad');
  assert.ok(out.includes('safe'));
  assert.ok(!out.includes('<script'));
});

test('sanitizeHtml: ampersand entities in attribute values are preserved (no double-encoding)', () => {
  const out = sanitizeHtml('<a href="https://example.com/?q=1&amp;r=2">x</a>');
  assert.ok(out.includes('href="https://example.com/?q=1&amp;r=2"'));
});
